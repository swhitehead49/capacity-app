import { asc, sql } from "drizzle-orm";
import { parseOpenHolidays, type OpenHolidaysEntry } from "../domain/holidays/openHolidays";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";
import { replaceHolidayCalendar } from "./replaceHolidayCalendar";

/** Countries whose holidays come from OpenHolidays (decision 8 Nov 2026). India uses a yearly CSV. */
export const OPEN_HOLIDAYS_COUNTRIES = ["AT", "BE", "DE", "FR"] as const;
const SOURCE = "OpenHolidays API";

export type LoadResult = { ok: true; count: number } | { ok: false; errors: string[] };

export interface LoadRequest {
  country: string;
  year: number;
  /** Where the answer comes from: the real API in the app, a fake in tests. */
  fetchEntries: (country: string, year: number) => Promise<OpenHolidaysEntry[]>;
}

/**
 * FR-20 / BR-10: load one country's public holidays for one year.
 * Fetch first; only if that worked, replace the year in one transaction and log it.
 */
export async function loadHolidayCalendar(db: Db, actor: string, request: LoadRequest): Promise<LoadResult> {
  const { country, year } = request;
  if (!(OPEN_HOLIDAYS_COUNTRIES as readonly string[]).includes(country)) {
    return { ok: false, errors: [`${country} is not loaded from OpenHolidays (India uses the yearly CSV upload)`] };
  }
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return { ok: false, errors: ["Year must be between 2020 and 2100"] };
  }

  let holidays;
  try {
    holidays = parseOpenHolidays(country, await request.fetchEntries(country, year))
      .filter((h) => h.date.startsWith(`${year}-`));
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
  if (holidays.length === 0) return { ok: false, errors: [`OpenHolidays sent no public holidays for ${country} ${year}`] };

  await replaceHolidayCalendar(db, actor, { country, year, source: SOURCE, action: "load", holidays });
  return { ok: true, count: holidays.length };
}

export interface CalendarRow {
  country: string; year: number; source: string; loadedAt: Date; holidays: number;
  /** Each location in that country, with the holidays that apply there (sean, 15 Nov 2026). */
  regions: { code: string; name: string; holidays: number }[];
}
export interface MissingCalendar { country: string; year: number; how: "OpenHolidays" | "CSV upload" }

/**
 * What the holidays screen shows: calendars already loaded, and the ones still
 * missing for this year and next in every country we have a location in.
 * Calendars are shared by all projects (sean, 15 Nov 2026): `db` is the top level, and
 * `projectDbs` are the projects whose locations count when working out what is missing.
 */
export async function listHolidayCalendars(db: Db, today: string, projectDbs: Db[] = [db]) {
  const c = t.holidayCalendars;
  const h = t.publicHolidays;
  const calendars = await db
    .select({
      country: c.country, year: c.year, source: c.source, loadedAt: c.loadedAt,
      holidays: sql<number>`(select count(*)::int from ${h} where ${h.country} = ${c.country}
        and extract(year from ${h.date}) = ${c.year})`,
    })
    .from(c).orderBy(asc(c.country), asc(c.year));
  // The system's locations (this database holds the reference list) and every holiday, to total them per location.
  const places = await db.select().from(t.locations).orderBy(asc(t.locations.code));
  const days = await db.select({ date: h.date, country: h.country, regions: h.regions }).from(h);
  const loaded: CalendarRow[] = calendars.map((cal) => {
    const inCalendar = days.filter((d) => d.country === cal.country && d.date.startsWith(String(cal.year)));
    const regions = places.filter((p) => p.country === cal.country).map((p) => ({
      code: p.code,
      name: p.name,
      // Nationwide holidays, plus the ones for that region. A whole-country location only gets the nationwide ones.
      holidays: inCalendar.filter((d) => d.regions.length === 0 || d.regions.includes(p.code)).length,
    }));
    return { ...cal, regions };
  });

  const thisYear = Number(today.slice(0, 4));
  const perProject = await Promise.all(projectDbs.map((p) => p.selectDistinct({ country: t.locations.country }).from(t.locations)));
  const countries = [...new Set(perProject.flat().map((r) => r.country))].sort();
  const have = new Set(loaded.map((r) => `${r.country}:${r.year}`));
  const missing: MissingCalendar[] = countries.flatMap((country) =>
    [thisYear, thisYear + 1]
      .filter((year) => !have.has(`${country}:${year}`))
      .map((year) => ({
        country, year,
        how: (OPEN_HOLIDAYS_COUNTRIES as readonly string[]).includes(country) ? "OpenHolidays" as const : "CSV upload" as const,
      })),
  );
  return { loaded, missing };
}
