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

describe("migration 0021: Run + Fix become Maintenance (sean, 26 Nov 2026)", () => {
  it("adds Fix into Run (Maintenance) in team settings and the standard allocation; the total stays the same", async () => {
    await db.insert(t.teams).values({ id: "T1", name: "A" });
    await db.insert(t.allocationSettings).values({
      teamId: "T1", level: "Team default", effectiveFrom: "2026-01-01", status: "Active", overhead: 0.2, contingency: 0, run: 0.3, fix: 0.2, sustain: 0.1, change: 0.2,
    });
    await db.insert(t.standardAllocation).values({ id: 1, overhead: 0.2, contingency: 0, run: 0.2, fix: 0.2, sustain: 0.2, change: 0.2, enabling: 0 });
    await rerun(db, "drizzle/0021_maintenance.sql");
    const [row] = await db.select().from(t.allocationSettings);
    expect([row?.run, row?.fix]).toEqual([0.5, 0]);
    const [standard] = await db.select().from(t.standardAllocation);
    expect([standard?.run, standard?.fix]).toEqual([0.4, 0]);
  });
});

describe("migration 0022: people are in a country, not a region (FR-05e, sean, 26 Nov 2026)", () => {
  it("adds a whole-country location per country, averages its regions' forecasts, and moves people to their country", async () => {
    await db.update(t.locations).set({ standardHours: 40 }).where(eq(t.locations.code, "DE-BY")); // DE-BY is already there
    await db.insert(t.locations).values([
      { code: "DE-NI", country: "DE", name: "Lower Saxony", standardHours: 38 },
      { code: "IN", country: "IN", name: "India", standardHours: 45 },
      { code: "IN-KA", country: "IN", name: "Bangalore", standardHours: 40 },
    ]);
    await db.insert(t.availabilityForecasts).values([
      { locationCode: "DE-BY", month: "2026-11", availability: 0.9 },
      { locationCode: "DE-NI", month: "2026-11", availability: 0.8 },
      { locationCode: "IN", month: "2026-11", availability: 0.7 },
      { locationCode: "IN-KA", month: "2026-11", availability: 0.5 },
    ]);
    await db.insert(t.people).values([
      { email: "a@example.com", locationCode: "DE-BY" }, { email: "b@example.com", locationCode: "IN-KA" }, { email: "c@example.com", locationCode: null },
    ]);
    for (const s of readFileSync("drizzle/0022_person_country.sql", "utf8").split("--> statement-breakpoint")) await db.execute(sql.raw(s));
    const locations = await db.select().from(t.locations);
    expect(locations.find((l) => l.code === "DE")).toEqual({ code: "DE", country: "DE", name: "Germany", standardHours: 40 });
    expect(locations.find((l) => l.code === "IN")?.name).toBe("India"); // already there: left alone
    const forecasts = await db.select().from(t.availabilityForecasts);
    expect(forecasts.find((f) => f.locationCode === "DE")?.availability).toBeCloseTo(0.85);
    expect(forecasts.find((f) => f.locationCode === "IN")?.availability).toBe(0.7);
    const people = (await db.select().from(t.people)).sort((x, y) => x.email.localeCompare(y.email)).map((p) => p.locationCode);
    expect(people).toEqual(["DE", "IN", null]);
  });
});
