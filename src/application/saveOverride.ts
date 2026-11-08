import { and, desc, eq, ne } from "drizzle-orm";
import { validateOverride, type OverrideDraft } from "../domain/capacity/overrideRules";
import * as t from "../infrastructure/db/schema";
import { findTeamDefault, loadTeamCapacityInput } from "../infrastructure/db/teamCapacityRepository";
import type { Db } from "../infrastructure/db/testDb";
import type { SaveResult } from "./saveTeamDefault";

type Level = "Sprint override" | "Quarter override";

export interface SaveOverrideRequest extends OverrideDraft {
  teamId: string;
  periodId: string;
}

/**
 * UC04 / FR-11: create or change the one override for a team and a sprint or quarter.
 * The level follows the period type (BR-04). Changes are logged with before and after.
 */
export async function saveOverride(db: Db, actor: string, request: SaveOverrideRequest): Promise<SaveResult> {
  const errors = validateOverride(request);
  if (errors.length) return { ok: false, errors };

  const period = await db.query.planningPeriods.findFirst({ where: eq(t.planningPeriods.id, request.periodId) });
  if (!period) return { ok: false, errors: [`Unknown planning period ${request.periodId}`] };
  const team = await db.query.teams.findFirst({ where: eq(t.teams.id, request.teamId) });
  if (!team) return { ok: false, errors: [`Unknown team ${request.teamId}`] };

  const level = levelFor(period.type);
  const values = {
    status: request.status,
    overhead: request.overhead,
    contingency: request.contingency ?? null,
    ...request.split,
    reason: request.reason,
    owner: actor,
  };

  return db.transaction(async (tx) => {
    const existing = await findOverride(tx as unknown as Db, request.teamId, request.periodId, level);
    if (existing) {
      const [updated] = await tx.update(t.allocationSettings).set(values)
        .where(eq(t.allocationSettings.id, existing.id)).returning();
      await tx.insert(t.auditLog).values({
        actor, entity: "allocation_settings", entityId: String(existing.id), action: "update",
        reason: request.reason, before: existing, after: updated,
      });
      return { ok: true as const, id: existing.id };
    }
    const [created] = await tx.insert(t.allocationSettings)
      .values({ teamId: request.teamId, level, periodId: request.periodId, ...values }).returning();
    if (!created) throw new Error("Saving the override failed");
    await tx.insert(t.auditLog).values({
      actor, entity: "allocation_settings", entityId: String(created.id), action: "create",
      reason: request.reason, after: created,
    });
    return { ok: true as const, id: created.id };
  });
}

/** What the Edit screen needs: the period, its override (if any) and what applies right now. */
export async function getOverride(db: Db, query: { teamId: string; periodId: string }) {
  const period = await db.query.planningPeriods.findFirst({ where: eq(t.planningPeriods.id, query.periodId) });
  if (!period) throw new Error(`Unknown planning period ${query.periodId}`);
  const level = levelFor(period.type);
  const row = await findOverride(db, query.teamId, query.periodId, level);
  const input = await loadTeamCapacityInput(db, { teamId: query.teamId, periodId: query.periodId, mode: "Auto" });
  const teamDefault = await findTeamDefault(db, query.teamId, period.startDate);
  return {
    period: { id: period.id, type: period.type, start: period.startDate, end: period.endDate },
    level,
    override: row
      ? {
          status: row.status,
          overhead: row.overhead,
          contingency: row.contingency,
          split: { run: row.run, fix: row.fix, sustain: row.sustain, change: row.change },
          reason: row.reason ?? "",
        }
      : null,
    currentlyApplied: input.allocation,
    teamDefault: teamDefault
      ? {
          effectiveFrom: teamDefault.effectiveFrom,
          overhead: teamDefault.overhead,
          contingency: teamDefault.contingency,
          split: { run: teamDefault.run, fix: teamDefault.fix, sustain: teamDefault.sustain, change: teamDefault.change },
        }
      : null,
  };
}

function levelFor(type: "Sprint" | "Quarter"): Level {
  return type === "Sprint" ? "Sprint override" : "Quarter override";
}

export async function findOverride(db: Db, teamId: string, periodId: string, level: Level) {
  const s = t.allocationSettings;
  const [row] = await db.select().from(s)
    .where(and(eq(s.teamId, teamId), eq(s.periodId, periodId), eq(s.level, level), ne(s.status, "Retired")))
    .orderBy(desc(s.id))
    .limit(1);
  return row;
}
