import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { seedDrgw } from "../infrastructure/db/fixtures";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { importMembers } from "./importMembers";

// FR-05b (sean, 22 Nov 2026): import team members into a project from the Team Members sheet saved as CSV.
// Same checks as Add member; the team must be one of the project's teams. Any problem means nothing is imported.

const actor = "Capacity Admin";
const today = "2026-11-22";
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await seedDrgw(db); // T017 DRGW (base DE-RP, unmapped, included): a–j@example.com
  await db.insert(t.teams).values([{ id: "T001", name: "Example Team A" }, { id: "T002", name: "Left Out", included: false }]);
});

const membersOf = (teamId: string) => db.select().from(t.assignments).where(eq(t.assignments.teamId, teamId));

describe("importMembers", () => {
  it("adds new people and memberships; a blank location means the team's base location", async () => {
    const csv = "Team_ID,Email,First_Name,Last_Name,Location,Team_Pct\nT017,ada@example.com,Ada,Lovelace,,50\nT001,grace@example.com,Grace,Hopper,DE-BY,\n";
    expect(await importMembers(db, actor, { csv, today })).toEqual({ ok: true, count: 2 });
    expect(await db.query.people.findFirst({ where: eq(t.people.email, "ada@example.com") }))
      .toMatchObject({ firstName: "Ada", lastName: "Lovelace", locationCode: "DE-RP" });
    expect(await membersOf("T001")).toEqual([expect.objectContaining({ personEmail: "grace@example.com", teamAllocation: 1, startDate: today })]);
    expect((await db.select().from(t.auditLog)).filter((a) => a.action === "import")).toHaveLength(2);
  });

  it("someone already in the project joins another team and keeps their details", async () => {
    const csv = "Team_ID,Email,First_Name,Contracted_Hours\nT001,a@example.com,Someone Else,20\n";
    expect(await importMembers(db, actor, { csv, today })).toEqual({ ok: true, count: 1 });
    expect(await db.query.people.findFirst({ where: eq(t.people.email, "a@example.com") })).toMatchObject({ firstName: null, contractedHours: 40 });
  });

  it("refuses unknown or left-out teams, unknown locations and people already on the team, and imports nothing", async () => {
    const csv = "Team_ID,Email,Location\nT999,x@example.com,\nT002,y@example.com,\nT001,z@example.com,XX-1\nT017,b@example.com,\nT001,ok@example.com,\n";
    expect(await importMembers(db, actor, { csv, today })).toEqual({
      ok: false,
      errors: [
        "Line 2: T999 is not one of this project's teams",
        "Line 3: T002 is not one of this project's teams",
        "Line 4: Unknown location XX-1",
        "Line 5: b@example.com is already a member of T017",
      ],
    });
    expect(await db.query.people.findFirst({ where: eq(t.people.email, "ok@example.com") })).toBeUndefined();
  });

  it("passes on problems found in the file", async () => {
    expect(await importMembers(db, actor, { csv: "Name\nAda\n", today }))
      .toEqual({ ok: false, errors: ['The first line must have the headings "Team_ID" and "Email"'] });
  });
});
