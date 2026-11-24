import type { Db } from "../infrastructure/db/testDb";
import { getTeamPlan, type PlanRow } from "./getTeamPlan";
import { listProjectTeams } from "./projectValueStreams";

// FR-19c (sean, 24 Nov 2026): Capacity Summary. For every sprint and quarter the Team Planner shows, the capacity of
// a) all the project's teams together, b) one value stream's teams, or c) one team, broken down by category.
// The categories (overhead, contingency, Run, Fix, Sustain, Change, Enabling/Training and Not allocated) always add up
// to the available days: a team without an Active allocation counts in full as Not allocated.

export type SummaryScope = { kind: "all" } | { kind: "valueStream"; name: string } | { kind: "team"; teamId: string };

export interface SummaryRow {
  periodId: string;
  start: string;
  end: string;
  teams: number;
  headcount: number;
  allocatedFte: number;
  available: number;
  overhead: number;
  contingency: number;
  run: number;
  fix: number;
  sustain: number;
  change: number;
  enabling: number;
  notAllocated: number;
}

/** Adds one team's planner row to the period's total. */
function add(total: SummaryRow | undefined, row: PlanRow): SummaryRow {
  const base: SummaryRow = total ?? {
    periodId: row.periodId, start: row.start, end: row.end, teams: 0, headcount: 0, allocatedFte: 0, available: 0,
    overhead: 0, contingency: 0, run: 0, fix: 0, sustain: 0, change: 0, enabling: 0, notAllocated: 0,
  };
  const allocated = row.engineeringDays !== null;
  return {
    ...base,
    teams: base.teams + 1,
    headcount: base.headcount + row.headcount,
    allocatedFte: base.allocatedFte + row.allocatedFte,
    available: base.available + row.calendarAvailableDays,
    overhead: base.overhead + (allocated ? row.calendarAvailableDays - row.engineeringDays! : 0),
    contingency: base.contingency + (row.contingencyDays ?? 0),
    run: base.run + (row.run ?? 0),
    fix: base.fix + (row.fix ?? 0),
    sustain: base.sustain + (row.sustain ?? 0),
    change: base.change + (row.change ?? 0),
    enabling: base.enabling + (row.enabling ?? 0),
    notAllocated: base.notAllocated + (allocated ? 0 : row.calendarAvailableDays),
  };
}

function totals(plans: PlanRow[][]): SummaryRow[] {
  const byPeriod = new Map<string, SummaryRow>();
  for (const rows of plans) for (const row of rows) byPeriod.set(row.periodId, add(byPeriod.get(row.periodId), row));
  return [...byPeriod.values()].sort((a, b) => a.start.localeCompare(b.start));
}

export async function getCapacitySummary(db: Db, query: { today: string; scope: SummaryScope }, holidayDb: Db = db) {
  const { scope, today } = query;
  const teams = (await listProjectTeams(db, today))
    .filter((x) => !x.status.startsWith("Retired"))
    .filter((x) => scope.kind === "all"
      || (scope.kind === "valueStream" && x.valueStream === scope.name)
      || (scope.kind === "team" && x.id === scope.teamId));
  const plans = await Promise.all(teams.map((x) => getTeamPlan(db, { teamId: x.id, today }, holidayDb)));
  return {
    teams: teams.map((x) => ({ id: x.id, name: x.name })),
    sprints: totals(plans.map((p) => p.sprints)),
    quarters: totals(plans.map((p) => p.quarters)),
  };
}
