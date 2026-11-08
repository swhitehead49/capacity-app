import type { IsoDate } from "../capacity/workingWindow";

export interface PlanningPeriod {
  id: string;
  type: "Sprint" | "Quarter";
  start: IsoDate;
  end: IsoDate;
  parentId: string | null; // a sprint's quarter
}

/** FR-08: fixed-length sprints numbered from 1, e.g. S001. */
export function generateSprints(options: { firstStart: IsoDate; lengthDays: number; count: number; prefix: string }): PlanningPeriod[] {
  return Array.from({ length: options.count }, (_, i) => {
    const start = addDays(options.firstStart, i * options.lengthDays);
    return {
      id: `${options.prefix}${String(i + 1).padStart(3, "0")}`,
      type: "Sprint" as const,
      start,
      end: addDays(start, options.lengthDays - 1),
      parentId: quarterId(start),
    };
  });
}

/** FR-08: calendar quarters, starting with the quarter that contains `from`. */
export function generateQuarters(options: { from: IsoDate; count: number }): PlanningPeriod[] {
  let start = quarterStart(options.from);
  return Array.from({ length: options.count }, () => {
    const next = addMonths(start, 3);
    const quarter = { id: quarterId(start), type: "Quarter" as const, start, end: addDays(next, -1), parentId: null };
    start = next;
    return quarter;
  });
}

/**
 * Team Planner horizon (agreed 8 Nov 2026):
 * sprints from the current one to the end of next quarter (a sprint that starts before then is included);
 * quarters from the current one to the end of next calendar year.
 */
export function planningHorizon(today: IsoDate, periods: PlanningPeriod[]) {
  const sprintLimit = addDays(addMonths(quarterStart(today), 6), -1);
  const quarterLimit = `${Number(today.slice(0, 4)) + 1}-12-31`;
  const inHorizon = (type: PlanningPeriod["type"], limit: IsoDate) =>
    periods
      .filter((p) => p.type === type && p.end >= today && p.start <= limit)
      .sort((a, b) => a.start.localeCompare(b.start));
  return { sprints: inHorizon("Sprint", sprintLimit), quarters: inHorizon("Quarter", quarterLimit) };
}

export function quarterId(date: IsoDate): string {
  return `${date.slice(0, 4)}-Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`;
}

function quarterStart(date: IsoDate): IsoDate {
  const month = Math.floor((Number(date.slice(5, 7)) - 1) / 3) * 3 + 1;
  return `${date.slice(0, 4)}-${String(month).padStart(2, "0")}-01`;
}

function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(date: IsoDate, months: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}
