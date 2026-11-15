import { and, eq } from "drizzle-orm";
import { toIsoDate } from "../domain/shared/csv";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";

// Add or remove single public holidays in a loaded calendar (sean, 15 Nov 2026). "db" is the shared database.
// A holiday added by hand is kept when the calendar is reloaded; a loaded holiday removed by hand stays removed.

export type HolidayChangeResult = { ok: true } | { ok: false; errors: string[] };

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export async function addPublicHoliday(
  db: Db, actor: string, request: { country: string; date: string; name: string; regions: string[]; reason: string },
): Promise<HolidayChangeResult> {
  const country = request.country.trim().toUpperCase();
  const date = toIsoDate(request.date.trim());
  const name = request.name.trim();
  const regions = [...new Set(request.regions.filter(Boolean))].sort();
  const known = new Set((await db.select({ code: t.locations.code }).from(t.locations).where(eq(t.locations.country, country))).map((l) => l.code));
  const errors: string[] = [];
  if (!date) errors.push("Date must be a real date");
  if (!name) errors.push("Name is needed");
  errors.push(...regions.filter((r) => !known.has(r)).map((r) => `${r} is not a location in ${country}`));
  if (errors.length || !date) return { ok: false, errors };

  const year = Number(date.slice(0, 4));
  const [calendar] = await db.select().from(t.holidayCalendars)
    .where(and(eq(t.holidayCalendars.country, country), eq(t.holidayCalendars.year, year)));
  if (!calendar) return { ok: false, errors: [`Load the ${country} ${year} calendar first`] };
  const sameDay = await db.select().from(t.publicHolidays).where(and(eq(t.publicHolidays.country, country), eq(t.publicHolidays.date, date)));
  if (sameDay.some((h) => h.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, errors: [`"${name}" is already a holiday on ${day.format(new Date(`${date}T00:00:00Z`))}`] };
  }

  await db.transaction(async (tx) => {
    const [row] = await tx.insert(t.publicHolidays).values({ country, date, name, regions, origin: "Added" }).returning();
    await tx.insert(t.auditLog).values({
      actor, entity: "public_holidays", entityId: `${country}:${date}`, action: "add", reason: request.reason.trim() || null, before: null, after: row,
    });
  });
  return { ok: true };
}

export async function removePublicHoliday(db: Db, actor: string, request: { id: number; reason: string }): Promise<HolidayChangeResult> {
  const holiday = await db.query.publicHolidays.findFirst({ where: eq(t.publicHolidays.id, request.id) });
  if (!holiday) return { ok: false, errors: ["That holiday no longer exists"] };
  await db.transaction(async (tx) => {
    await tx.delete(t.publicHolidays).where(eq(t.publicHolidays.id, holiday.id));
    // A loaded holiday is remembered, so reloading the calendar doesn't bring it back.
    if (holiday.origin === "Loaded") {
      await tx.insert(t.removedHolidays).values({ country: holiday.country, date: holiday.date, name: holiday.name, regions: holiday.regions });
    }
    await tx.insert(t.auditLog).values({
      actor, entity: "public_holidays", entityId: `${holiday.country}:${holiday.date}`, action: "remove",
      reason: request.reason.trim() || null, before: holiday, after: null,
    });
  });
  return { ok: true };
}

/** Undo the removal of a loaded holiday. */
export async function putBackPublicHoliday(db: Db, actor: string, request: { id: number }): Promise<HolidayChangeResult> {
  const removed = await db.query.removedHolidays.findFirst({ where: eq(t.removedHolidays.id, request.id) });
  if (!removed) return { ok: false, errors: ["That holiday is not removed"] };
  await db.transaction(async (tx) => {
    await tx.delete(t.removedHolidays).where(eq(t.removedHolidays.id, removed.id));
    const [row] = await tx.insert(t.publicHolidays)
      .values({ country: removed.country, date: removed.date, name: removed.name, regions: removed.regions, origin: "Loaded" }).returning();
    await tx.insert(t.auditLog).values({
      actor, entity: "public_holidays", entityId: `${removed.country}:${removed.date}`, action: "put back", before: null, after: row,
    });
  });
  return { ok: true };
}
