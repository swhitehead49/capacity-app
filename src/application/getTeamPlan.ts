import { eq } from "drizzle-orm";
import type { AllocationSource } from "../domain/capacity/allocation";
import { teamCapacity, type CapacityStatus } from "../domain/capacity/teamCapacity";
import { planningHorizon } from "../domain/planning/periods";
import * as t from "../infrastructure/db/schema";
import { loadTeamCapacityInput } from "../infrastructure/db/teamCapacityRepository";
import type { Db } from "../infrastructure/db/testDb";

export interface PlanRow {
  periodId: string;
  start: string;
  end: string;
  headcount: number;
  excludedPeople: number;
  allocatedFte: number;
  calendarAvailableDays: number;
  engineeringDays: number | null;
  contingencyDays: number | null;
  run: number | null;
  fix: number | null;
  sustain: number | null;
  change: number | null;
  splitSource: AllocationSource | null;
  status: Exclude<CapacityStatus, "Excluded">;
  editLevel: "Sprint override" | "Quarter override"; // what the Edit button opens
}

/** UC01: everything the Team Planner shows for one team, as of `today`. */
export async function getTeamPlan(db: Db, query: { teamId: string; today: string }) {
  const team = await db.query.teams.findFirst({ where: eq(t.teams.id, query.teamId) });
  if (!team) throw new Error(`Unknown team ${query.teamId}`);

  const periods = (await db.select().from(t.planningPeriods)).map((p) => ({
    id: p.id, type: p.type, start: p.startDate, end: p.endDate, parentId: p.parentPeriodId,
  }));
  const horizon = planningHorizon(query.today, periods);

  const row = async (periodId: string, editLevel: PlanRow["editLevel"]): Promise<PlanRow> => {
    const input = await loadTeamCapacityInput(db, { teamId: team.id, periodId, mode: "Auto" });
    const result = teamCapacity(input);
    const counted = result.members.filter((m) => m.status !== "Excluded");
    return {
      periodId,
      start: input.period.start,
      end: input.period.end,
      headcount: result.headcount,
      excludedPeople: result.headcount - counted.length,
      allocatedFte: result.allocatedFte,
      calendarAvailableDays: result.calendarAvailableDays,
      engineeringDays: result.engineeringDays,
      contingencyDays: result.contingencyDays,
      run: result.run,
      fix: result.fix,
      sustain: result.sustain,
      change: result.change,
      splitSource: input.allocation.splitSource,
      status: counted.some((m) => m.status === "Provisional") ? "Provisional"
        : input.allocation.split === null ? "Calendar capacity only"
        : "Ready",
      editLevel,
    };
  };

  return {
    team: { id: team.id, name: team.name },
    sprints: await Promise.all(horizon.sprints.map((p) => row(p.id, "Sprint override"))),
    quarters: await Promise.all(horizon.quarters.map((p) => row(p.id, "Quarter override"))),
  };
}
