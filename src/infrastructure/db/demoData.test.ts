import { describe, expect, it } from "vitest";
import * as t from "./schema";
import { createTestDb } from "./testDb";
import { seedDemoIfEmpty } from "./demoData";

// Hosting (8 Nov 2026): a hosted copy can't run "npm run seed", so with SEED_DEMO_DATA=true the app
// fills an EMPTY database with the demo data when it starts. It never touches a database that has data.

describe("seedDemoIfEmpty", () => {
  it("fills an empty database with the demo teams and timeline", async () => {
    const db = await createTestDb();
    expect(await seedDemoIfEmpty(db, "2026-11-08")).toBe(true);
    const teams = await db.select().from(t.teams);
    expect(teams.map((x) => x.id).sort()).toEqual(["T001", "T002", "T017"]);
    expect(await db.select().from(t.timelineSettings)).toHaveLength(1);
    expect((await db.select().from(t.planningPeriods)).length).toBeGreaterThan(10);
  });

  it("does nothing when there is already data", async () => {
    const db = await createTestDb();
    await db.insert(t.teams).values({ id: "T500", name: "Real team" });
    expect(await seedDemoIfEmpty(db, "2026-11-08")).toBe(false);
    expect(await db.select().from(t.teams)).toHaveLength(1);
  });
});
