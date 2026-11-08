import { and, asc, between, eq } from "drizzle-orm";
import { appliesTo } from "../domain/capacity/holidays";
import { isWeekday } from "../domain/capacity/workingWindow";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** FR-20 / UC10: one country's holidays for a year, optionally only those that apply in one region. */
export async function getHolidayCalendar(db: Db, query: { country: string; year: number; region?: string }) {
  const [calendar] = await db.select().from(t.holidayCalendars)
    .where(and(eq(t.holidayCalendars.country, query.country), eq(t.holidayCalendars.year, query.year)));
  const regions = await db.select({ code: t.locations.code, name: t.locations.name }).from(t.locations)
    .where(eq(t.locations.country, query.country)).orderBy(asc(t.locations.code));

  const h = t.publicHolidays;
  const rows = calendar
    ? await db.select().from(h)
        .where(and(eq(h.country, query.country), between(h.date, `${query.year}-01-01`, `${query.year}-12-31`)))
        .orderBy(asc(h.date), asc(h.name))
    : [];
  const holidays = rows
    .filter((row) => !query.region || appliesTo(row, { country: query.country, region: query.region }))
    .map((row) => ({
      date: row.date,
      weekday: WEEKDAY[new Date(`${row.date}T00:00:00Z`).getUTCDay()]!,
      name: row.name,
      regions: row.regions,
      isWeekday: isWeekday(row.date),
    }));
  return { calendar: calendar ?? null, regions, holidays, weekdayCount: holidays.filter((x) => x.isWeekday).length };
}
