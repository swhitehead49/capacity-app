import { and, eq, gte, inArray, ne } from "drizzle-orm";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";

/**
 * Revert one period to the team default (requested 8 Nov 2026): retire its override.
 * Nothing is deleted; the change is logged. Returns how many overrides were retired.
 */
export async function revertOverride(db: Db, actor: string, query: { teamId: string; periodId: string }) {
  return retire(db, actor, query.teamId, [query.periodId], "Reverted this period to the team default");
}

/** Revert every current and future period for a team. Past periods keep their overrides as history. */
export async function revertAllOverrides(db: Db, actor: string, query: { teamId: string; today: string }) {
  const periods = await db.select({ id: t.planningPeriods.id }).from(t.planningPeriods)
    .where(gte(t.planningPeriods.endDate, query.today));
  return retire(db, actor, query.teamId, periods.map((p) => p.id), "Reverted all periods to the team default");
}

async function retire(db: Db, actor: string, teamId: string, periodIds: string[], reason: string) {
  if (periodIds.length === 0) return 0;
  const s = t.allocationSettings;
  const live = and(eq(s.teamId, teamId), ne(s.level, "Team default"), ne(s.status, "Retired"), inArray(s.periodId, periodIds));
  return db.transaction(async (tx) => {
    const before = await tx.select().from(s).where(live);
    for (const row of before) {
      const [after] = await tx.update(s).set({ status: "Retired" }).where(eq(s.id, row.id)).returning();
      await tx.insert(t.auditLog).values({
        actor, entity: "allocation_settings", entityId: String(row.id), action: "revert", reason, before: row, after,
      });
    }
    return before.length;
  });
}
