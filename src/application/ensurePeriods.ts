import { periodsNeeded } from "../domain/planning/periods";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";

/**
 * UC11, automatic (decision 8 Nov 2026): create any sprints and quarters the planner needs on `today`.
 * Existing periods are never changed. Returns how many were added.
 */
export async function ensurePeriods(db: Db, today: string): Promise<number> {
  const timeline = await db.query.timelineSettings.findFirst();
  if (!timeline) throw new Error("Timeline settings are missing");

  const needed = periodsNeeded(today, timeline);
  const added = await db.insert(t.planningPeriods)
    .values(needed.map((p) => ({ id: p.id, type: p.type, startDate: p.start, endDate: p.end, parentPeriodId: p.parentId })))
    .onConflictDoNothing()
    .returning({ id: t.planningPeriods.id });
  return added.length;
}
