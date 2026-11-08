import { beforeEach, describe, expect, it } from "vitest";
import { seedDrgw } from "../infrastructure/db/fixtures";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { getTeamDefaults } from "./getTeamDefaults";
import { getTeamPlan } from "./getTeamPlan";
import { getOverride, saveOverride } from "./saveOverride";
import { saveTeamDefault } from "./saveTeamDefault";
import { ensurePeriods } from "./ensurePeriods";
import * as t from "../infrastructure/db/schema";

// Contingency (decided 8 Nov 2026): saved on defaults and overrides, shown in the planner.

const actor = "Capacity Admin";
const split = { run: 0.3, fix: 0.2, sustain: 0.2, change: 0.3 };
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await seedDrgw(db); // T017 default: 20% overhead, no contingency
  await db.insert(t.timelineSettings).values({ id: 1, firstSprintStart: "2026-10-26", sprintLengthDays: 14, sprintPrefix: "S" });
  await ensurePeriods(db, "2026-11-08");
  await saveTeamDefault(db, actor, { teamId: "T017", status: "Active", effectiveFrom: "2026-01-01", overhead: 0.2, contingency: 0.1, split });
});

describe("contingency", () => {
  it("is saved on the team default and shown with it", async () => {
    const { current } = await getTeamDefaults(db, { teamId: "T017", today: "2026-11-08" });
    expect(current?.contingency).toBe(0.1);
  });

  it("existing defaults without one count as 0%", async () => {
    const { history } = await getTeamDefaults(db, { teamId: "T017", today: "2026-11-08" });
    expect(history.find((h) => h.status === "Retired")?.contingency).toBeNull();
  });

  it("the planner holds it back: DRGW S001 has 5.8 contingency days and 15.67 Run days", async () => {
    const plan = await getTeamPlan(db, { teamId: "T017", today: "2026-11-08" });
    const s001 = plan.sprints.find((r) => r.periodId === "S001");
    expect(s001?.engineeringDays).toBeCloseTo(58.032);
    expect(s001?.contingencyDays).toBeCloseTo(5.8032);
    expect(s001?.run).toBeCloseTo(15.66864);
  });

  it("an override can set its own, or leave it blank to inherit", async () => {
    await saveOverride(db, actor, { teamId: "T017", periodId: "S001", status: "Active", overhead: null, contingency: 0, split, reason: "Release sprint" });
    let view = await getOverride(db, { teamId: "T017", periodId: "S001" });
    expect(view.override?.contingency).toBe(0);
    expect(view.currentlyApplied).toMatchObject({ contingency: 0, contingencySource: "Sprint override" });
    expect(view.teamDefault?.contingency).toBe(0.1);

    await saveOverride(db, actor, { teamId: "T017", periodId: "S001", status: "Active", overhead: null, contingency: null, split, reason: "Release sprint" });
    view = await getOverride(db, { teamId: "T017", periodId: "S001" });
    expect(view.currentlyApplied).toMatchObject({ contingency: 0.1, contingencySource: "Team default" });
  });
});
