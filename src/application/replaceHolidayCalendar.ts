import { and, between, count, eq, sql } from "drizzle-orm";
import type { PublicHoliday } from "../domain/capacity/holidays";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";

/**
 * BR-10: swap in a whole country/year of holidays, in one transaction, and log it.
 * Shared by the OpenHolidays load and the CSV upload. Callers validate first.
 */
export async function replaceHolidayCalendar(
  db: Db,
  actor: string,
  calendar: { country: string; year: number; source: string; action: "load" | "upload"; holidays: PublicHoliday[] },
) {
  const { country, year, source, holidays } = calendar;
  const h = t.publicHolidays;
  const inYear = and(eq(h.country, country), between(h.date, `${year}-01-01`, `${year}-12-31`));
  await db.transaction(async (tx) => {
    const [before] = await tx.select({ n: count() }).from(h).where(inYear);
    await tx.delete(h).where(inYear);
    await tx.insert(h).values(holidays);
    await tx.insert(t.holidayCalendars).values({ country, year, source })
      .onConflictDoUpdate({
        target: [t.holidayCalendars.country, t.holidayCalendars.year],
        set: { source, loadedAt: sql`now()` },
      });
    await tx.insert(t.auditLog).values({
      actor, entity: "holiday_calendars", entityId: `${country}:${year}`, action: calendar.action,
      reason: `Loaded from ${source}`, before: { holidays: before?.n ?? 0 }, after: { holidays: holidays.length },
    });
  });
}
