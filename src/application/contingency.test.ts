import { beforeEach, describe, expect, it } from "vitest";
import { seedDrgw } from "../infrastructure/db/fixtures";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { getTeamDefaults } from "./getTeamDefaults";
import { getTeamPlan } from "./getTeamPlan";
import { getOverride, saveOverride } from "./saveOverride";
import { saveTeamDefault } from "./saveTeamDefault";
import { ensurePeriods } from "./ensurePeriods";
import * as t from "../infrastructure/db/schema";

// Contingency (decided 8 Nov 2026), saved on defaults and overrides and shown in the planner.
// One 100% (sean, 15 Nov 2026): contingency is a % of available days, like overhead and each type of work.

const actor = "Capacity Admin";
const split = { run: 0.216, fix: 0.144, sustain: 0.144, change: 0.216 }; // with 20% overhead and 8% contingency = 100%
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await seedDrgw(db); // T017 default: 20% overhead, no contingency
  await db.insert(t.timelineSettings).values({ id: 1, firstSprintStart: "2026-10-26", sprintLengthDays: 14, sprintPrefix: "S" });
  await ensurePeriods(db, "2026-11-08");
  await saveTeamDefault(db, actor, { teamId: "T017", status: "Active", effectiveFrom: "2026-01-01", overhead: 0.2, contingency: 0.08, split });
});

describe("contingency", () => {
  it("is saved on the team default and shown with it", async () => {
    const { current } = await getTeamDefaults(db, { teamId: "T017", today: "2026-11-08" });
    expect(current?.contingency).toBe(0.08);
  });

  it("the replaced default had 0%", async () => {
    const { history } = await getTeamDefaults(db, { teamId: "T017", today: "2026-11-08" });
    expect(history.find((h) => h.status === "Retired")?.contingency).toBe(0);
  });

  it("the planner shows it in days: DRGW S001 has 5.8 contingency days and 15.67 Run days", async () => {
    const plan = await getTeamPlan(db, { teamId: "T017", today: "2026-11-08" });
    const s001 = plan.sprints.find((r) => r.periodId === "S001");
    expect(s001?.engineeringDays).toBeCloseTo(58.032);
    expect(s001?.contingencyDays).toBeCloseTo(5.8032);
    expect(s001?.run).toBeCloseTo(15.66864);
  });

  it("an override sets its own; blank means 0%", async () => {
    await saveOverride(db, actor, { teamId: "T017", periodId: "S001", status: "Active", overhead: 0.2, contingency: 0.1, split: { run: 0.3, fix: 0.1, sustain: 0.1, change: 0.2 }, reason: "Risky release" });
    let view = await getOverride(db, { teamId: "T017", periodId: "S001" });
    expect(view.override?.contingency).toBe(0.1);
    expect(view.currentlyApplied).toMatchObject({ contingency: 0.1, contingencySource: "Sprint override" });
    expect(view.teamDefault?.contingency).toBe(0.08);

    await saveOverride(db, actor, { teamId: "T017", periodId: "S001", status: "Active", overhead: 0.2, contingency: null, split: { run: 0.4, fix: 0.1, sustain: 0.1, change: 0.2 }, reason: "Release sprint" });
    view = await getOverride(db, { teamId: "T017", periodId: "S001" });
    expect(view.currentlyApplied).toMatchObject({ contingency: 0, contingencySource: "Sprint override" });
  });
});
