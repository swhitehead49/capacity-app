import { and, eq } from "drizzle-orm";
import { validateTeamDefault, type TeamDefaultDraft } from "../domain/capacity/teamDefaultRules";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";

export interface SaveTeamDefaultRequest extends TeamDefaultDraft {
  teamId: string;
  reason?: string;
}

export type SaveResult = { ok: true; id: number } | { ok: false; errors: string[] };

/**
 * UC03 / FR-10: save a team default.
 * Checks the rules first, then saves and writes the audit log in one transaction,
 * so either everything is saved or nothing is.
 */
export async function saveTeamDefault(db: Db, actor: string, request: SaveTeamDefaultRequest): Promise<SaveResult> {
  const errors = validateTeamDefault(request);
  if (errors.length) return { ok: false, errors };

  const team = await db.query.teams.findFirst({ where: eq(t.teams.id, request.teamId) });
  if (!team) return { ok: false, errors: [`Unknown team ${request.teamId}`] };

  return db.transaction(async (tx) => {
    const settings = t.allocationSettings;

    // Only one Active default per team and date: retire the one being replaced.
    if (request.status === "Active" && request.effectiveFrom) {
      const replaced = await tx.update(settings)
        .set({ status: "Retired" })
        .where(and(
          eq(settings.teamId, request.teamId),
          eq(settings.level, "Team default"),
          eq(settings.status, "Active"),
          eq(settings.effectiveFrom, request.effectiveFrom),
        ))
        .returning();
      for (const row of replaced) {
        await tx.insert(t.auditLog).values({
          actor, entity: "allocation_settings", entityId: String(row.id), action: "retire",
          reason: "Replaced by a new default", before: { ...row, status: "Active" }, after: row,
        });
      }
    }

    const [saved] = await tx.insert(settings).values({
      teamId: request.teamId,
      level: "Team default",
      effectiveFrom: request.effectiveFrom,
      status: request.status,
      overhead: request.overhead,
      contingency: request.contingency ?? null,
      ...request.split,
      reason: request.reason,
      owner: actor,
    }).returning();
    if (!saved) throw new Error("Saving the team default failed");

    await tx.insert(t.auditLog).values({
      actor, entity: "allocation_settings", entityId: String(saved.id), action: "create",
      reason: request.reason, after: saved,
    });
    return { ok: true as const, id: saved.id };
  });
}
