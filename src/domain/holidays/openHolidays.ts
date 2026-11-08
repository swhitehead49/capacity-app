import type { PublicHoliday } from "../capacity/holidays";
import { eachDay } from "../capacity/workingWindow";

/** One item of the OpenHolidays API answer (only the fields we use). */
export interface OpenHolidaysEntry {
  startDate: string;
  endDate: string;
  type: string; // "Public", "Bank", ...
  name: { language: string; text: string }[];
  temporalScope?: string; // "FullDay" or "HalfDay"
  nationwide: boolean;
  subdivisions?: { code: string }[];
}

/**
 * FR-20: turn an OpenHolidays answer into our holiday records.
 * Pure: no network. Only full-day public holidays count; one record per day.
 */
export function parseOpenHolidays(country: string, entries: OpenHolidaysEntry[]): PublicHoliday[] {
  return entries
    .filter((e) => e.type === "Public" && e.temporalScope !== "HalfDay")
    .flatMap((e) => {
      const name = (e.name.find((n) => n.language === "EN") ?? e.name[0])?.text ?? "Holiday";
      const regions = e.nationwide ? [] : (e.subdivisions ?? []).map((s) => s.code);
      return eachDay({ start: e.startDate, end: e.endDate }).map((date) => ({ date, country, regions, name }));
    });
}
