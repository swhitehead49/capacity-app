import { isHoliday, type Location, type PublicHoliday } from "./holidays";
import { eachDay, effectiveWindow, isWeekday, type DateRange } from "./workingWindow";

/** One booked absence (FR-07). dayFraction: 1 = full days, 0.5 = half days. */
export interface Absence extends DateRange {
  dayFraction: number;
  status: "Booked" | "Cancelled";
}

export type AvailabilityMode = "Auto" | "Explicit only" | "Forecast only";

/**
 * FR-07: absence days in the window, counting only working days
 * (weekdays that are not public holidays). Overlapping absences on the same day count once.
 */
export function countAbsenceDays(
  window: DateRange | null,
  location: Location,
  absences: Absence[],
  holidays: PublicHoliday[],
): number {
  if (!window) return 0;
  const awayByDay = new Map<string, number>();
  for (const absence of absences) {
    if (absence.status === "Cancelled") continue;
    const overlap = effectiveWindow(window, absence);
    for (const day of eachDay(overlap)) {
      if (!isWeekday(day) || isHoliday(day, location, holidays)) continue;
      awayByDay.set(day, Math.max(awayByDay.get(day) ?? 0, absence.dayFraction));
    }
  }
  return [...awayByDay.values()].reduce((sum, fraction) => sum + fraction, 0);
}

/**
 * Step 6 (requirements §3): working days left after absence.
 * Auto takes off whichever is larger: booked absence or the forecast reduction (decided 8 Nov 2026).
 * A missing forecast counts as 100% available (BR-11).
 */
export function availableDays(input: {
  workingDays: number;
  absenceDays: number;
  forecast: number | null;
  mode: AvailabilityMode;
}): number {
  const { workingDays, absenceDays, mode } = input;
  const forecastReduction = workingDays * (1 - (input.forecast ?? 1));
  const deduction =
    mode === "Explicit only" ? absenceDays
    : mode === "Forecast only" ? forecastReduction
    : Math.max(absenceDays, forecastReduction);
  return Math.max(0, workingDays - deduction);
}
