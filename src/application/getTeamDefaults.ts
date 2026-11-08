import { and, desc, eq, sql } from "drizzle-orm";
import * as t from "../infrastructure/db/schema";
import { findTeamDefault } from "../infrastructure/db/teamCapacityRepository";
import type { Db } from "../infrastructure/db/testDb";

export interface DefaultVersion {
  id: number;
  effectiveFrom: string | null;
  status: "Draft" | "Active" | "Retired";
  overhead: number | null;
  split: { run: number; fix: number; sustain: number; change: number };
  reason: string | null;
}

/** UC03: the team default in force today, and every version (newest first) for the history table. */
export async function getTeamDefaults(db: Db, query: { teamId: string; today: string }) {
  const team = await db.query.teams.findFirst({ where: eq(t.teams.id, query.teamId) });
  if (!team) throw new Error(`Unknown team ${query.teamId}`);
  const s = t.allocationSettings;
  const rows = await db.select().from(s)
    .where(and(eq(s.teamId, query.teamId), eq(s.level, "Team default")))
    .orderBy(sql`${s.effectiveFrom} desc nulls first`, desc(s.id));
  const inForce = await findTeamDefault(db, query.teamId, query.today);
  return {
    team,
    current: inForce ? toVersion(inForce) : null,
    history: rows.map(toVersion),
  };
}

function toVersion(row: typeof t.allocationSettings.$inferSelect): DefaultVersion {
  return {
    id: row.id, effectiveFrom: row.effectiveFrom, status: row.status, overhead: row.overhead, reason: row.reason,
    split: { run: row.run, fix: row.fix, sustain: row.sustain, change: row.change },
  };
}
