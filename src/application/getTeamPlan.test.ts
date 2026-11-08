import { beforeEach, describe, expect, it } from "vitest";
import { generateQuarters, generateSprints } from "../domain/planning/periods";
import { seedDrgw } from "../infrastructure/db/fixtures";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { getTeamPlan } from "./getTeamPlan";

// UC01 (Team Planner, as agreed 8 Nov 2026): one row per sprint and quarter in the horizon,
// each showing the capacity already known and what to open for editing.

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await seedDrgw(db); // adds 2026-Q4 and S001
  const extraQuarters = generateQuarters({ from: "2027-01-01", count: 8 });
  const extraSprints = generateSprints({ firstStart: "2026-10-26", lengthDays: 14, count: 52, prefix: "S" }).slice(1);
  await db.insert(t.planningPeriods).values(
    [...extraQuarters, ...extraSprints].map((p) => ({
      id: p.id, type: p.type, startDate: p.start, endDate: p.end, parentPeriodId: p.parentId,
    })),
  );
});

describe("getTeamPlan for DRGW on 8 Nov 2026", () => {
  it("lists 12 sprints, then 5 quarters", async () => {
    const plan = await getTeamPlan(db, { teamId: "T017", today: "2026-11-08" });
    expect(plan.team).toEqual({ id: "T017", name: "DRGW" });
    expect(plan.sprints.map((r) => r.periodId)).toHaveLength(12);
    expect(plan.quarters.map((r) => r.periodId)).toEqual(["2026-Q4", "2027-Q1", "2027-Q2", "2027-Q3", "2027-Q4"]);
  });

  it("shows the known capacity for the current sprint", async () => {
    const plan = await getTeamPlan(db, { teamId: "T017", today: "2026-11-08" });
    const s001 = plan.sprints[0];
    expect(s001).toMatchObject({ periodId: "S001", start: "2026-10-26", end: "2026-11-08", splitSource: "Team default" });
    expect(s001?.allocatedFte).toBeCloseTo(8.06);
    expect(s001?.calendarAvailableDays).toBeCloseTo(72.54);
    expect(s001?.engineeringDays).toBeCloseTo(58.032);
  });

  it("says which override a period would edit", async () => {
    const plan = await getTeamPlan(db, { teamId: "T017", today: "2026-11-08" });
    expect(plan.sprints[0]?.editLevel).toBe("Sprint override");
    expect(plan.quarters[0]?.editLevel).toBe("Quarter override");
  });

  it("shows a quarter override where one is Active", async () => {
    await db.insert(t.allocationSettings).values({
      teamId: "T017", level: "Quarter override", periodId: "2027-Q1", status: "Active",
      overhead: null, run: 0.4, fix: 0.2, sustain: 0.1, change: 0.3,
    });
    const plan = await getTeamPlan(db, { teamId: "T017", today: "2026-11-08" });
    expect(plan.quarters[1]).toMatchObject({ periodId: "2027-Q1", splitSource: "Quarter override" });
  });

  it("flags periods with no holiday calendar loaded as Provisional", async () => {
    const plan = await getTeamPlan(db, { teamId: "T017", today: "2026-11-08" });
    expect(plan.quarters.find((q) => q.periodId === "2027-Q2")?.status).toBe("Provisional");
  });

  it("fails clearly for an unknown team", async () => {
    await expect(getTeamPlan(db, { teamId: "T999", today: "2026-11-08" })).rejects.toThrow("Unknown team T999");
  });
});
