import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { seedDrgw } from "../infrastructure/db/fixtures";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { addMember, endMember, getMember, getTeamMembers, moveMember, updateMember } from "./teamMembers";

// UC06 review team members; UC07 add, edit, move or end a member (FR-05, BR-14, BR-21, BR-22).

const actor = "Capacity Admin";
const today = "2026-11-08";
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await seedDrgw(db); // T017 DRGW: a–j@example.com, f has no contracted hours
  await db.insert(t.teams).values({ id: "T001", name: "Example Team A" });
});

const newPerson = {
  role: "Engineer", locationCode: "DE-BY", contractedHours: 40, employmentStart: "2026-11-01", employmentEnd: null,
};
const audit = () => db.select().from(t.auditLog);
const assignmentsOf = (email: string) => db.select().from(t.assignments).where(eq(t.assignments.personEmail, email));

describe("getTeamMembers (UC06)", () => {
  it("lists the team's current members with their details and input status", async () => {
    const { team, current, past } = await getTeamMembers(db, { teamId: "T017", today });
    expect(team.name).toBe("DRGW");
    expect(current).toHaveLength(10);
    expect(past).toEqual([]);
    expect(current.find((m) => m.email === "b@example.com")).toMatchObject({
      locationCode: "DE-NI", contractedHours: 36, teamAllocation: 0.9, sharedResource: false, inputStatus: "Complete",
    });
    expect(current.find((m) => m.email === "f@example.com")?.inputStatus).toBe("Missing contracted hours");
  });

  it("someone whose membership ended before today is listed under past members", async () => {
    const [a] = await assignmentsOf("a@example.com");
    await endMember(db, actor, { assignmentId: a!.id, endDate: "2026-11-01" });
    const { current, past } = await getTeamMembers(db, { teamId: "T017", today });
    expect(current).toHaveLength(9);
    expect(past.map((m) => m.email)).toEqual(["a@example.com"]);
  });

  it("an unknown team is an error", async () => {
    await expect(getTeamMembers(db, { teamId: "NOPE", today })).rejects.toThrow("Unknown team NOPE");
  });
});

describe("addMember (BR-21)", () => {
  it("adds a new person and their membership, and logs it", async () => {
    const result = await addMember(db, actor, {
      teamId: "T017", email: "new@example.com", teamAllocation: 0.5, sharedResource: true, startDate: "2026-11-09", person: newPerson,
    });
    expect(result.ok).toBe(true);
    const [person] = await db.select().from(t.people).where(eq(t.people.email, "new@example.com"));
    expect(person).toMatchObject({ locationCode: "DE-BY", contractedHours: 40, role: "Engineer" });
    expect(await assignmentsOf("new@example.com")).toEqual([
      expect.objectContaining({ teamId: "T017", teamAllocation: 0.5, sharedResource: true, startDate: "2026-11-09", endDate: null }),
    ]);
    expect(await audit()).toEqual([
      expect.objectContaining({ entity: "assignments", action: "add", after: expect.objectContaining({ personEmail: "new@example.com" }) }),
    ]);
  });

  it("adds an existing person to a second team without changing their details", async () => {
    const result = await addMember(db, actor, {
      teamId: "T001", email: "i@example.com", teamAllocation: 0.5, sharedResource: true, startDate: "2026-11-09",
      person: { ...newPerson, contractedHours: 20 },
    });
    expect(result.ok).toBe(true);
    const [person] = await db.select().from(t.people).where(eq(t.people.email, "i@example.com"));
    expect(person?.contractedHours).toBe(40);
    expect(await assignmentsOf("i@example.com")).toHaveLength(2);
  });

  it("emails are matched without caring about capitals or spaces", async () => {
    await addMember(db, actor, { teamId: "T001", email: " I@Example.com ", teamAllocation: 0.5, sharedResource: false, startDate: "2026-11-09", person: newPerson });
    expect(await assignmentsOf("i@example.com")).toHaveLength(2);
  });

  it("refuses someone who is already a current member of that team", async () => {
    const result = await addMember(db, actor, {
      teamId: "T017", email: "a@example.com", teamAllocation: 1, sharedResource: false, startDate: "2026-11-09", person: newPerson,
    });
    expect(result).toEqual({ ok: false, errors: ["a@example.com is already a member of this team"] });
  });

  it("refuses bad values and saves nothing", async () => {
    const result = await addMember(db, actor, {
      teamId: "T017", email: "x", teamAllocation: 0, sharedResource: false, startDate: "2026-11-09", person: newPerson,
    });
    expect(result).toEqual({ ok: false, errors: ["Email must look like name@company.com", "Team % must be more than 0 and at most 100"] });
    expect(await audit()).toHaveLength(0);
  });

  it("refuses a location that doesn't exist", async () => {
    const result = await addMember(db, actor, {
      teamId: "T017", email: "new@example.com", teamAllocation: 1, sharedResource: false, startDate: "2026-11-09",
      person: { ...newPerson, locationCode: "XX-1" },
    });
    expect(result).toEqual({ ok: false, errors: ["Unknown location XX-1"] });
  });
});

describe("updateMember (UC07 edit)", () => {
  it("changes the person and their membership together, logging before and after", async () => {
    const [f] = await assignmentsOf("f@example.com");
    const result = await updateMember(db, actor, {
      assignmentId: f!.id, teamAllocation: 0.8, sharedResource: true,
      person: { role: "Tester", locationCode: "DE-BY", contractedHours: 32, employmentStart: null, employmentEnd: "2027-06-30" },
    });
    expect(result.ok).toBe(true);
    const member = await getMember(db, f!.id);
    expect(member).toMatchObject({
      email: "f@example.com", role: "Tester", locationCode: "DE-BY", contractedHours: 32, employmentEnd: "2027-06-30",
      teamAllocation: 0.8, sharedResource: true, inputStatus: "Complete",
    });
    const [entry] = await audit();
    expect(entry).toMatchObject({
      entity: "assignments", action: "edit",
      before: expect.objectContaining({ contractedHours: null, teamAllocation: 1 }),
      after: expect.objectContaining({ contractedHours: 32, teamAllocation: 0.8 }),
    });
  });

  it("refuses bad values", async () => {
    const [a] = await assignmentsOf("a@example.com");
    const result = await updateMember(db, actor, { assignmentId: a!.id, teamAllocation: 2, sharedResource: false, person: newPerson });
    expect(result).toEqual({ ok: false, errors: ["Team % must be more than 0 and at most 100"] });
  });
});

describe("endMember (BR-22)", () => {
  it("sets an end date, deletes nothing, and logs it", async () => {
    const [a] = await assignmentsOf("a@example.com");
    expect(await endMember(db, actor, { assignmentId: a!.id, endDate: "2026-11-30" })).toEqual({ ok: true, id: a!.id });
    expect(await assignmentsOf("a@example.com")).toEqual([expect.objectContaining({ endDate: "2026-11-30" })]);
    expect((await audit())[0]).toMatchObject({ action: "end", before: expect.objectContaining({ endDate: null }) });
  });

  it("refuses an end before the start", async () => {
    const added = await addMember(db, actor, { teamId: "T001", email: "a@example.com", teamAllocation: 0.5, sharedResource: false, startDate: "2026-12-01", person: newPerson });
    if (!added.ok) throw new Error("setup failed");
    const result = await endMember(db, actor, { assignmentId: added.id, endDate: "2026-11-30" });
    expect(result).toEqual({ ok: false, errors: ["End date must be on or after the start date (1 Dec 2026)"] });
  });
});

describe("moveMember (BR-22)", () => {
  it("ends the old membership the day before and starts the new one on the move date", async () => {
    const [b] = await assignmentsOf("b@example.com");
    const result = await moveMember(db, actor, { assignmentId: b!.id, toTeamId: "T001", date: "2026-12-01", teamAllocation: null });
    expect(result.ok).toBe(true);
    expect(await assignmentsOf("b@example.com")).toEqual([
      expect.objectContaining({ teamId: "T017", endDate: "2026-11-30" }),
      expect.objectContaining({ teamId: "T001", startDate: "2026-12-01", endDate: null, teamAllocation: 0.9 }),
    ]);
    expect((await audit()).map((e) => e.action)).toEqual(["move", "move"]);
  });

  it("can change the team % as part of the move", async () => {
    const [b] = await assignmentsOf("b@example.com");
    await moveMember(db, actor, { assignmentId: b!.id, toTeamId: "T001", date: "2026-12-01", teamAllocation: 0.5 });
    const rows = await assignmentsOf("b@example.com");
    expect(rows[1]?.teamAllocation).toBe(0.5);
  });

  it("refuses a move to the same team", async () => {
    const [b] = await assignmentsOf("b@example.com");
    const result = await moveMember(db, actor, { assignmentId: b!.id, toTeamId: "T017", date: "2026-12-01", teamAllocation: null });
    expect(result).toEqual({ ok: false, errors: ["Pick a different team to move to"] });
  });

  it("refuses an unknown team and changes nothing", async () => {
    const [b] = await assignmentsOf("b@example.com");
    const result = await moveMember(db, actor, { assignmentId: b!.id, toTeamId: "NOPE", date: "2026-12-01", teamAllocation: null });
    expect(result).toEqual({ ok: false, errors: ["Unknown team NOPE"] });
    expect(await assignmentsOf("b@example.com")).toHaveLength(1);
  });
});
