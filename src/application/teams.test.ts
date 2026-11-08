import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { seedDrgw } from "../infrastructure/db/fixtures";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { addTeam, changeValueStream, listTeamsOverview, listValueStreams, renameTeam, retireTeam, getTeamDetails } from "./teams";
import { endMember } from "./teamMembers";

// UC15 add, UC16 rename, UC17 retire a team (FR-18, BR-15 to BR-20, BR-23). Nothing is ever deleted.

const actor = "Capacity Admin";
const today = "2026-11-08";
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await seedDrgw(db); // T017 DRGW with 10 members and an Active default
  await db.insert(t.teams).values([
    { id: "T001", name: "Example Team A", valueStream: "Platform" },
    { id: "T002", name: "Example Team B", valueStream: "Platform" },
  ]);
});

const team = (id: string) => db.query.teams.findFirst({ where: eq(t.teams.id, id) });
const audit = () => db.select().from(t.auditLog);
const newTeam = { id: "T100", name: "Payments", valueStream: "Platform", leadEmail: "lead@example.com", effectiveFrom: "2026-11-09" };

describe("addTeam (UC15)", () => {
  it("creates the team, its first name, a Draft default, and logs it", async () => {
    expect(await addTeam(db, actor, newTeam)).toEqual({ ok: true, id: "T100", warnings: [] });
    expect(await team("T100")).toMatchObject({ name: "Payments", valueStream: "Platform", leadEmail: "lead@example.com", retiredOn: null });
    expect(await db.select().from(t.teamNameHistory).where(eq(t.teamNameHistory.teamId, "T100")))
      .toEqual([expect.objectContaining({ name: "Payments", effectiveFrom: "2026-11-09" })]);
    const defaults = await db.select().from(t.allocationSettings).where(eq(t.allocationSettings.teamId, "T100"));
    expect(defaults).toEqual([expect.objectContaining({ level: "Team default", status: "Draft" })]); // BR-17
    expect((await audit()).map((a) => [a.entity, a.action])).toEqual([["teams", "add"]]);
  });

  it("an ID is never reused, even after the team is retired (BR-15)", async () => {
    await db.update(t.teams).set({ retiredOn: "2026-01-01" }).where(eq(t.teams.id, "T002"));
    expect(await addTeam(db, actor, { ...newTeam, id: "T002" })).toEqual({ ok: false, errors: ["Team ID T002 is already used"] });
  });

  it("the same name under the same parent is refused (BR-16)", async () => {
    expect(await addTeam(db, actor, { ...newTeam, name: "example team a" }))
      .toEqual({ ok: false, errors: ['"example team a" is already a team in Platform'] });
  });

  it("the same name under a different parent is allowed but flagged (BR-16)", async () => {
    const result = await addTeam(db, actor, { ...newTeam, name: "Example Team A", valueStream: "Clinical" });
    expect(result).toEqual({ ok: true, id: "T100", warnings: ['"Example Team A" is also a team in Platform'] });
  });

  it("needs an ID, a name and a start date; the lead email must look right", async () => {
    const result = await addTeam(db, actor, { id: " ", name: "", valueStream: null, leadEmail: "boss", effectiveFrom: "" });
    expect(result).toEqual({ ok: false, errors: [
      "Team ID is needed (letters, digits and - only)", "Name is needed", "Start date is needed", "Lead email must look like name@company.com",
    ] });
  });
});

describe("renameTeam (UC16)", () => {
  it("changes the name, keeps the old one in the dated history, and logs it (BR-20)", async () => {
    expect(await renameTeam(db, actor, { teamId: "T017", name: "Diagnostics Gateway", effectiveFrom: "2026-12-01" }))
      .toEqual({ ok: true, id: "T017", warnings: [] });
    expect((await team("T017"))?.name).toBe("Diagnostics Gateway");
    const { names } = await getTeamDetails(db, { teamId: "T017", today });
    expect(names.map((n) => [n.name, n.effectiveFrom])).toEqual([["Diagnostics Gateway", "2026-12-01"], ["DRGW", null]]);
    expect((await audit())[0]).toMatchObject({ entity: "teams", action: "rename", before: { name: "DRGW" }, after: { name: "Diagnostics Gateway" } });
  });

  it("refuses the current name, a blank name, or a clash in the same parent", async () => {
    expect(await renameTeam(db, actor, { teamId: "T017", name: "DRGW", effectiveFrom: today })).toEqual({ ok: false, errors: ["That is already the team's name"] });
    expect(await renameTeam(db, actor, { teamId: "T001", name: "Example Team B", effectiveFrom: today }))
      .toEqual({ ok: false, errors: ['"Example Team B" is already a team in Platform'] });
    expect(await renameTeam(db, actor, { teamId: "T001", name: " ", effectiveFrom: today })).toEqual({ ok: false, errors: ["Name is needed"] });
  });
});

describe("retireTeam (UC17)", () => {
  it("refuses while anyone is still on the team after the end date, naming them (BR-18)", async () => {
    const result = await retireTeam(db, actor, { teamId: "T017", retiredOn: "2026-12-31", successorTeamIds: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toBe("Move or end these members first: a@example.com, b@example.com, c@example.com, d@example.com, e@example.com, f@example.com, g@example.com, h@example.com, i@example.com, j@example.com");
  });

  it("retires an empty team from its end date, records successors, and logs it (BR-23)", async () => {
    const result = await retireTeam(db, actor, { teamId: "T001", retiredOn: "2026-12-31", successorTeamIds: ["T002"] });
    expect(result).toEqual({ ok: true, id: "T001", warnings: [] });
    expect((await team("T001"))?.retiredOn).toBe("2026-12-31");
    expect(await db.select().from(t.teamSuccessors)).toEqual([{ teamId: "T001", successorTeamId: "T002" }]);
    expect((await audit()).map((a) => a.action)).toEqual(["retire"]);
  });

  it("works once members are ended on or before the date; settings starting later are retired, earlier ones kept (BR-19)", async () => {
    const members = await db.select().from(t.assignments).where(eq(t.assignments.teamId, "T017"));
    for (const m of members) await endMember(db, actor, { assignmentId: m.id, endDate: "2026-12-31" });
    await db.insert(t.allocationSettings).values({
      teamId: "T017", level: "Team default", effectiveFrom: "2027-01-01", status: "Active",
      overhead: 0.1, run: 0.25, fix: 0.25, sustain: 0.25, change: 0.25,
    });
    const result = await retireTeam(db, actor, { teamId: "T017", retiredOn: "2026-12-31", successorTeamIds: [] });
    expect(result.ok).toBe(true);
    const defaults = await db.select().from(t.allocationSettings).where(eq(t.allocationSettings.teamId, "T017"));
    expect(defaults.map((d) => [d.effectiveFrom, d.status])).toEqual([["2026-01-01", "Active"], ["2027-01-01", "Retired"]]);
  });

  it("refuses unknown, self or already-retired successors, and a team that is already retired", async () => {
    expect(await retireTeam(db, actor, { teamId: "T001", retiredOn: "2026-12-31", successorTeamIds: ["T001"] }))
      .toEqual({ ok: false, errors: ["A team can't succeed itself"] });
    expect(await retireTeam(db, actor, { teamId: "T001", retiredOn: "2026-12-31", successorTeamIds: ["NOPE"] }))
      .toEqual({ ok: false, errors: ["Unknown successor team NOPE"] });
    await retireTeam(db, actor, { teamId: "T002", retiredOn: "2026-12-31", successorTeamIds: [] });
    expect(await retireTeam(db, actor, { teamId: "T002", retiredOn: "2027-01-31", successorTeamIds: [] }))
      .toEqual({ ok: false, errors: ["T002 is already retired"] });
  });
});

describe("listTeamsOverview", () => {
  it("lists every team with its status and number of current members (FR-19)", async () => {
    await retireTeam(db, actor, { teamId: "T002", retiredOn: "2026-10-31", successorTeamIds: ["T001"] });
    const teams = await listTeamsOverview(db, today);
    expect(teams.map((x) => [x.id, x.name, x.status, x.members])).toEqual([
      ["T001", "Example Team A", "Active", 0],
      ["T002", "Example Team B", "Retired 31 Oct 2026", 0],
      ["T017", "DRGW", "Active", 10],
    ]);
  });

  it("a team retiring later still shows as active until then", async () => {
    await retireTeam(db, actor, { teamId: "T002", retiredOn: "2026-12-31", successorTeamIds: [] });
    const teams = await listTeamsOverview(db, today);
    expect(teams.find((x) => x.id === "T002")?.status).toBe("Retiring 31 Dec 2026");
  });
});

describe("value streams (FR-01, decision 8 Nov 2026: the value stream is the level just above a team)", () => {
  it("moves a team to another value stream and logs it", async () => {
    expect(await changeValueStream(db, actor, { teamId: "T017", valueStream: " Diagnostics " })).toEqual({ ok: true, id: "T017", warnings: [] });
    expect((await team("T017"))?.valueStream).toBe("Diagnostics");
    expect((await audit())[0]).toMatchObject({
      entity: "teams", action: "change value stream", before: { valueStream: null }, after: { valueStream: "Diagnostics" },
    });
  });

  it("refuses a move that would clash with a team of the same name there (BR-16)", async () => {
    await addTeam(db, actor, { id: "T100", name: "DRGW", valueStream: "Diagnostics", leadEmail: null, effectiveFrom: today });
    expect(await changeValueStream(db, actor, { teamId: "T017", valueStream: "Diagnostics" }))
      .toEqual({ ok: false, errors: ['"DRGW" is already a team in Diagnostics'] });
  });

  it("refuses the value stream the team is already in", async () => {
    expect(await changeValueStream(db, actor, { teamId: "T001", valueStream: "platform" }))
      .toEqual({ ok: false, errors: ["T001 is already in Platform"] });
  });

  it("blank means no value stream", async () => {
    await changeValueStream(db, actor, { teamId: "T001", valueStream: "" });
    expect((await team("T001"))?.valueStream).toBeNull();
  });

  it("lists the value streams in use, for the filter", async () => {
    await changeValueStream(db, actor, { teamId: "T017", valueStream: "Diagnostics" });
    expect(await listValueStreams(db)).toEqual(["Diagnostics", "Platform"]);
  });

  it("the Teams list can be filtered to one value stream", async () => {
    const teams = await listTeamsOverview(db, today, { valueStream: "Platform" });
    expect(teams.map((x) => x.id)).toEqual(["T001", "T002"]);
  });
});
