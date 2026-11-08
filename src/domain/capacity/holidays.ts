import { isWeekday, type DateRange, type IsoDate } from "./workingWindow";

/** A public holiday, shaped like the OpenHolidays API (FR-20). */
export interface PublicHoliday {
  date: IsoDate;
  country: string; // e.g. "DE"
  regions: string[]; // e.g. ["DE-BY"]; empty = the whole country
  name: string;
}

/** Where a person works, as country + region code (e.g. DE + DE-BY). */
export interface Location {
  country: string;
  region: string;
}

/** Step 5 (requirements §3, BR-09): weekday public holidays in the window for this location. */
export function countHolidayWeekdays(
  window: DateRange | null,
  location: Location,
  holidays: PublicHoliday[],
): number {
  if (!window) return 0;
  const days = new Set(
    holidays
      .filter((h) => h.date >= window.start && h.date <= window.end)
      .filter((h) => appliesTo(h, location))
      .filter((h) => isWeekday(h.date))
      .map((h) => h.date),
  );
  return days.size;
}

/** True if the date is a public holiday at this location. */
export function isHoliday(date: IsoDate, location: Location, holidays: PublicHoliday[]): boolean {
  return holidays.some((h) => h.date === date && appliesTo(h, location));
}

/** BR-09: a holiday applies to the whole country (no regions) or to the listed regions. */
export function appliesTo(holiday: PublicHoliday, location: Location): boolean {
  if (holiday.country !== location.country) return false;
  return holiday.regions.length === 0 || holiday.regions.includes(location.region);
}
