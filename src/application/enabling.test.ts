import { beforeEach, describe, expect, it } from "vitest";
import { seedDrgw } from "../infrastructure/db/fixtures";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import * as t from "../infrastructure/db/schema";
import { ensurePeriods } from "./ensurePeriods";
import { getTeamDefaults } from "./getTeamDefaults";
import { getTeamPlan } from "./getTeamPlan";
import { getOverride, saveOverride } from "./saveOverride";
import { saveTeamDefault } from "./saveTeamDefault";

// Enabling/Training (sean, 15 Nov 2026): a fifth work type, saved on defaults and overrides, shown in the planner.

const actor = "Capacity Admin";
const split = { run: 0.24, fix: 0.16, sustain: 0.16, change: 0.16, enabling: 0.08 }; // with 20% overhead = 100%
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await seedDrgw(db); // T017 default: 20% overhead, no Enabling/Training yet
  await db.insert(t.timelineSettings).values({ id: 1, firstSprintStart: "2026-10-26", sprintLengthDays: 14, sprintPrefix: "S" });
  await ensurePeriods(db, "2026-11-08");
});

describe("Enabling/Training", () => {
  it("existing defaults count as 0%", async () => {
    const { current } = await getTeamDefaults(db, { teamId: "T017", today: "2026-11-08" });
    expect(current?.split.enabling).toBe(0);
    const plan = await getTeamPlan(db, { teamId: "T017", today: "2026-11-08" });
    expect(plan.sprints.find((r) => r.periodId === "S001")?.enabling).toBe(0);
  });

  it("is saved on the team default and planned in days: DRGW S001 gets 5.8 Enabling/Training days", async () => {
    await saveTeamDefault(db, actor, { teamId: "T017", status: "Active", effectiveFrom: "2026-01-01", overhead: 0.2, split });
    const { current } = await getTeamDefaults(db, { teamId: "T017", today: "2026-11-08" });
    expect(current?.split.enabling).toBe(0.08);
    const plan = await getTeamPlan(db, { teamId: "T017", today: "2026-11-08" });
    expect(plan.sprints.find((r) => r.periodId === "S001")?.enabling).toBeCloseTo(5.8032);
  });

  it("an override can set its own", async () => {
    await saveOverride(db, actor, { teamId: "T017", periodId: "S001", status: "Active", overhead: 0.2, contingency: 0, split: { ...split, change: 0.08, enabling: 0.16 }, reason: "Training sprint" });
    const view = await getOverride(db, { teamId: "T017", periodId: "S001" });
    expect(view.override?.split.enabling).toBe(0.16);
  });
});
