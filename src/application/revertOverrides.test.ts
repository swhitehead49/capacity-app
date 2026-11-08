import { and, eq, ne } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { generateSprints } from "../domain/planning/periods";
import { seedDrgw } from "../infrastructure/db/fixtures";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { revertAllOverrides, revertOverride } from "./revertOverrides";
import { getOverride, saveOverride } from "./saveOverride";

// Revert to team default (requested 8 Nov 2026): for one period, or for all current and future periods.
// Reverting retires overrides; nothing is deleted, and each one is logged.

let db: Db;
const actor = "Capacity Admin";
const override = (periodId: string) => ({
  teamId: "T017", periodId, status: "Active" as const, overhead: null,
  split: { run: 0.5, fix: 0.2, sustain: 0.1, change: 0.2 }, reason: "Test",
});
const liveOverrides = () => db.select().from(t.allocationSettings)
  .where(and(ne(t.allocationSettings.level, "Team default"), ne(t.allocationSettings.status, "Retired")));

beforeEach(async () => {
  db = await createTestDb();
  await seedDrgw(db); // 2026-Q4 and S001
  const [, s002] = generateSprints({ firstStart: "2026-10-26", lengthDays: 14, count: 2, prefix: "S" });
  await db.insert(t.planningPeriods).values([
    { id: s002!.id, type: "Sprint", startDate: s002!.start, endDate: s002!.end, parentPeriodId: "2026-Q4" },
    { id: "2026-Q3", type: "Quarter", startDate: "2026-07-01", endDate: "2026-09-30" },
  ]);
  for (const id of ["S001", "S002", "2026-Q4", "2026-Q3"]) await saveOverride(db, actor, override(id));
});

describe("revertOverride (one period)", () => {
  it("retires the override so the team default applies again", async () => {
    expect(await revertOverride(db, actor, { teamId: "T017", periodId: "S001" })).toBe(1);
    const view = await getOverride(db, { teamId: "T017", periodId: "S001" });
    expect(view.override).toBeNull();
    expect(view.currentlyApplied.splitSource).toBe("Quarter override"); // the quarter's override still applies
  });

  it("logs the revert and keeps the row", async () => {
    await revertOverride(db, actor, { teamId: "T017", periodId: "S001" });
    const [row] = await db.select().from(t.allocationSettings).where(eq(t.allocationSettings.periodId, "S001"));
    expect(row?.status).toBe("Retired");
    const log = await db.select().from(t.auditLog).where(eq(t.auditLog.action, "revert"));
    expect(log).toHaveLength(1);
  });

  it("does nothing when there is no override", async () => {
    await revertOverride(db, actor, { teamId: "T017", periodId: "S001" });
    expect(await revertOverride(db, actor, { teamId: "T017", periodId: "S001" })).toBe(0);
  });
});

describe("revertAllOverrides", () => {
  it("retires overrides for current and future periods only", async () => {
    expect(await revertAllOverrides(db, actor, { teamId: "T017", today: "2026-11-08" })).toBe(3);
    const remaining = await liveOverrides();
    expect(remaining.map((r) => r.periodId)).toEqual(["2026-Q3"]); // past quarter kept as history
  });

  it("brings every current period back to the team default", async () => {
    await revertAllOverrides(db, actor, { teamId: "T017", today: "2026-11-08" });
    const view = await getOverride(db, { teamId: "T017", periodId: "S001" });
    expect(view.currentlyApplied.splitSource).toBe("Team default");
  });
});

describe("getOverride shows the team default for reference", () => {
  it("includes the default in force for the period", async () => {
    const view = await getOverride(db, { teamId: "T017", periodId: "S001" });
    expect(view.teamDefault).toEqual({
      effectiveFrom: "2026-01-01", overhead: 0.2, contingency: null, split: { run: 0.3, fix: 0.2, sustain: 0.2, change: 0.3 },
    });
  });
});
