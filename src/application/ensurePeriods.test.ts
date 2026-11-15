import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { ensurePeriods } from "./ensurePeriods";

// UC11, made automatic (decision 8 Nov 2026): create any missing sprints and quarters in the window.

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await db.insert(t.timelineSettings).values({ id: 1, firstSprintStart: "2026-10-26", sprintLengthDays: 14, sprintPrefix: "S" });
});

describe("ensurePeriods", () => {
  it("uses the one shared sprint calendar, so every project has the same sprints (sean, 15 Nov 2026)", async () => {
    const project = await createTestDb(); // another project: no calendar of its own
    await ensurePeriods(project, "2026-11-08", db);
    const ids = (await project.select().from(t.planningPeriods)).map((p) => p.id).sort();
    await ensurePeriods(db, "2026-11-08");
    expect(ids).toEqual((await db.select().from(t.planningPeriods)).map((p) => p.id).sort());
    expect(await project.select().from(t.timelineSettings)).toEqual([]);
  });

  it("creates the sprints and quarters for the window", async () => {
    const added = await ensurePeriods(db, "2026-11-08");
    expect(added).toBe(17); // 12 sprints + 5 quarters
    expect(await db.select().from(t.planningPeriods)).toHaveLength(17);
  });

  it("adds nothing when run again", async () => {
    await ensurePeriods(db, "2026-11-08");
    expect(await ensurePeriods(db, "2026-11-08")).toBe(0);
  });

  it("only adds the new ones as time passes", async () => {
    await ensurePeriods(db, "2026-11-08");
    const added = await ensurePeriods(db, "2027-01-15"); // window now runs to 30 Jun 2027 / end of 2028
    expect(added).toBeGreaterThan(0);
    expect(await db.select().from(t.planningPeriods).where(eq(t.planningPeriods.id, "2028-Q4"))).toHaveLength(1);
  });

  it("never changes a period that already exists", async () => {
    await db.insert(t.planningPeriods).values({ id: "S001", type: "Sprint", startDate: "2026-10-27", endDate: "2026-11-09" });
    await ensurePeriods(db, "2026-11-08");
    const [s001] = await db.select().from(t.planningPeriods).where(eq(t.planningPeriods.id, "S001"));
    expect(s001?.startDate).toBe("2026-10-27");
  });

  it("fails clearly when the timeline has not been set up", async () => {
    await db.delete(t.timelineSettings);
    await expect(ensurePeriods(db, "2026-11-08")).rejects.toThrow("Timeline settings are missing");
  });
});
