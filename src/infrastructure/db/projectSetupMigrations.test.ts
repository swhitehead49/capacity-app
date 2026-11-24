import { readFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import * as t from "./schema";
import { createTestDb, type Db } from "./testDb";

// The data changes in migrations 0017 (FR-18s) and 0018 (FR-18t), re-run on data saved the old way.
const statements = (file: string) => readFileSync(file, "utf8").split("--> statement-breakpoint").filter((s) => s.includes("UPDATE"));
const rerun = async (db: Db, file: string) => { for (const s of statements(file)) await db.execute(sql.raw(s)); };
const team = (db: Db, id: string) => db.query.teams.findFirst({ where: eq(t.teams.id, id) });
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await db.insert(t.valueStreams).values([{ name: "Radiology" }, { name: "Clinical" }]);
  await db.insert(t.locations).values([{ code: "DE-BY", country: "DE", name: "Bavaria" }, { code: "AT-9", country: "AT", name: "Vienna" }]);
});

describe("migration 0017: a team is in a project when ticked", () => {
  it("ticks exactly the teams that were in the project through its value streams; teams without one keep their tick", async () => {
    await db.insert(t.projectValueStreams).values({ name: "Radiology" });
    await db.insert(t.teams).values([
      { id: "T1", name: "A", valueStream: "Radiology", included: false },
      { id: "T2", name: "B", valueStream: "Clinical", included: true },
      { id: "T3", name: "C", valueStream: null, included: true },
    ]);
    await rerun(db, "drizzle/0017_project_ticks.sql");
    expect([(await team(db, "T1"))?.included, (await team(db, "T2"))?.included, (await team(db, "T3"))?.included]).toEqual([true, false, true]);
  });
});

describe("migration 0018: a team's base location becomes its country", () => {
  it("turns location codes into their country and leaves countries and blanks alone", async () => {
    await db.insert(t.teams).values([
      { id: "T1", name: "A", baseLocation: "DE-BY" }, { id: "T2", name: "B", baseLocation: "AT" }, { id: "T3", name: "C", baseLocation: null },
    ]);
    await rerun(db, "drizzle/0018_base_country.sql");
    expect([(await team(db, "T1"))?.baseLocation, (await team(db, "T2"))?.baseLocation, (await team(db, "T3"))?.baseLocation]).toEqual(["DE", "AT", null]);
  });
});

describe("migration 0020: team % imported as a fraction (sean, 24 Nov 2026: 1 -> 100, 0.8 -> 80)", () => {
  it("multiplies every team % of 1% or less by 100 and leaves the rest alone", async () => {
    await db.insert(t.teams).values({ id: "T1", name: "A" });
    const emails = ["a", "b", "c", "d", "e"].map((x) => `${x}@example.com`);
    await db.insert(t.people).values(emails.map((email) => ({ email })));
    await db.insert(t.assignments).values([0.01, 0.008, 0.005, 0.5, null].map((teamAllocation, i) => ({ personEmail: emails[i]!, teamId: "T1", teamAllocation })));
    await rerun(db, "drizzle/0020_team_pct_one_hundred.sql");
    const shares = (await db.select().from(t.assignments)).sort((x, y) => x.personEmail.localeCompare(y.personEmail)).map((a) => a.teamAllocation);
    expect(shares).toEqual([1, 0.8, 0.5, 0.5, null]);
  });
});
