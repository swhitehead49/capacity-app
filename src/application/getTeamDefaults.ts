import { and, desc, eq, sql } from "drizzle-orm";
import * as t from "../infrastructure/db/schema";
import { findTeamDefault } from "../infrastructure/db/teamCapacityRepository";
import type { Db } from "../infrastructure/db/testDb";

export interface DefaultVersion {
  id: number;
  effectiveFrom: string | null;
  status: "Draft" | "Active" | "Retired";
  overhead: number | null;
  contingency: number | null; // null = none set (0%)
  split: { run: number; fix: number; sustain: number; change: number; enabling: number };
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
    id: row.id, effectiveFrom: row.effectiveFrom, status: row.status, overhead: row.overhead, contingency: row.contingency, reason: row.reason,
    split: { run: row.run, fix: row.fix, sustain: row.sustain, change: row.change, enabling: row.enabling },
  };
}

export interface TeamDefaultRow {
  teamId: string;
  effectiveFrom: string | null;
  overhead: number | null;
  contingency: number | null;
  split: DefaultVersion["split"] | null;
  /** "Standard" when it matches the project's standard allocation, "Own" when it differs. */
  source: "Standard" | "Own" | "No active default";
}

/** sean, 22 Nov 2026: every listed team's default in force today, for Team planning's Default capacity tab. */
export async function listTeamDefaults(
  db: Db, query: { teamIds: string[]; today: string; standard: { overhead: number; contingency: number; split: DefaultVersion["split"] } | null },
): Promise<TeamDefaultRow[]> {
  const rows: TeamDefaultRow[] = [];
  for (const teamId of query.teamIds) {
    const row = await findTeamDefault(db, teamId, query.today);
    if (!row) { rows.push({ teamId, effectiveFrom: null, overhead: null, contingency: null, split: null, source: "No active default" }); continue; }
    const { effectiveFrom, overhead, contingency, split } = toVersion(row);
    rows.push({ teamId, effectiveFrom, overhead, contingency, split, source: matches(toVersion(row), query.standard) ? "Standard" : "Own" });
  }
  return rows;
}

function matches(v: DefaultVersion, standard: { overhead: number; contingency: number; split: DefaultVersion["split"] } | null): boolean {
  if (!standard) return false;
  const same = (a: number | null, b: number) => Math.abs((a ?? 0) - b) < 1e-9;
  return same(v.overhead, standard.overhead) && same(v.contingency, standard.contingency)
    && (Object.keys(standard.split) as (keyof DefaultVersion["split"])[]).every((k) => same(v.split[k], standard.split[k]));
}
