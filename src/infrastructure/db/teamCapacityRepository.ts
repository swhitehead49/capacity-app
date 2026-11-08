import { and, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { resolveAllocation, type AllocationSetting } from "../../domain/capacity/allocation";
import type { AvailabilityMode } from "../../domain/capacity/availability";
import type { Member, TeamCapacityInput } from "../../domain/capacity/teamCapacity";
import * as t from "./schema";
import type { Db } from "./testDb";

/**
 * Reads everything the capacity engine needs for one team and period from the database,
 * and turns it into the plain shape the domain expects. No calculation happens here.
 */
export async function loadTeamCapacityInput(
  db: Db,
  query: { teamId: string; periodId: string; mode: AvailabilityMode },
): Promise<TeamCapacityInput> {
  const period = await db.query.planningPeriods.findFirst({ where: eq(t.planningPeriods.id, query.periodId) });
  if (!period) throw new Error(`Unknown planning period ${query.periodId}`);
  const range = { start: period.startDate, end: period.endDate };

  // Assignments to this team that overlap the period (an empty date means open-ended).
  const rows = await db
    .select()
    .from(t.assignments)
    .innerJoin(t.people, eq(t.assignments.personEmail, t.people.email))
    .leftJoin(t.locations, eq(t.people.locationCode, t.locations.code))
    .where(and(
      eq(t.assignments.teamId, query.teamId),
      or(isNull(t.assignments.startDate), lte(t.assignments.startDate, range.end)),
      or(isNull(t.assignments.endDate), gte(t.assignments.endDate, range.start)),
    ));

  const emails = rows.map((r) => r.people.email);
  const absenceRows = emails.length
    ? await db.select().from(t.absences).where(inArray(t.absences.personEmail, emails))
    : [];

  const members: Member[] = rows.map(({ assignments: a, people: p, locations: loc }) => ({
    id: p.email,
    active: p.active,
    location: loc ? { country: loc.country, region: loc.code } : null,
    contractedHours: p.contractedHours,
    standardHours: loc?.standardHours ?? null,
    teamAllocation: a.teamAllocation,
    employment: { start: later(p.employmentStart, a.startDate), end: earlier(p.employmentEnd, a.endDate) },
    absences: absenceRows
      .filter((ab) => ab.personEmail === p.email)
      .map((ab) => ({ start: ab.startDate, end: ab.endDate, dayFraction: ab.dayFraction, status: ab.status })),
  }));

  const countries = [...new Set(rows.flatMap((r) => (r.locations ? [r.locations.country] : [])))];
  const regions = [...new Set(rows.flatMap((r) => (r.locations ? [r.locations.code] : [])))];

  const holidays = countries.length
    ? await db.select().from(t.publicHolidays).where(and(
        inArray(t.publicHolidays.country, countries),
        gte(t.publicHolidays.date, range.start),
        lte(t.publicHolidays.date, range.end),
      ))
    : [];
  const calendars = await db.select().from(t.holidayCalendars);
  const forecasts = regions.length
    ? await db.select().from(t.availabilityForecasts).where(inArray(t.availabilityForecasts.locationCode, regions))
    : [];

  return {
    period: range,
    mode: query.mode,
    members,
    holidays: holidays.map((h) => ({ date: h.date, country: h.country, regions: h.regions, name: h.name })),
    holidayCalendarsLoaded: calendars.map((c) => `${c.country}:${c.year}`),
    forecasts: forecasts.map((f) => ({ region: f.locationCode, month: f.month, availability: f.availability })),
    allocation: await loadAllocation(db, query.teamId, period),
  };
}

async function loadAllocation(
  db: Db,
  teamId: string,
  period: typeof t.planningPeriods.$inferSelect,
) {
  const quarterId = period.type === "Quarter" ? period.id : period.parentPeriodId;
  const settings = t.allocationSettings;
  const active = eq(settings.status, "Active");

  const teamDefault = await findTeamDefault(db, teamId, period.startDate);
  const [quarter] = quarterId
    ? await db.select().from(settings)
        .where(and(eq(settings.teamId, teamId), eq(settings.level, "Quarter override"), eq(settings.periodId, quarterId), active))
        .limit(1)
    : [];
  const [sprint] = period.type === "Sprint"
    ? await db.select().from(settings)
        .where(and(eq(settings.teamId, teamId), eq(settings.level, "Sprint override"), eq(settings.periodId, period.id), active))
        .limit(1)
    : [];

  return resolveAllocation({ teamDefault: toSetting(teamDefault), quarter: toSetting(quarter), sprint: toSetting(sprint) });
}

/** The team default in force on a date: the latest Active one already effective. */
export async function findTeamDefault(db: Db, teamId: string, date: string) {
  const settings = t.allocationSettings;
  const [row] = await db.select().from(settings)
    .where(and(
      eq(settings.teamId, teamId), eq(settings.level, "Team default"),
      eq(settings.status, "Active"), lte(settings.effectiveFrom, date),
    ))
    .orderBy(desc(settings.effectiveFrom))
    .limit(1);
  return row;
}

function toSetting(row?: typeof t.allocationSettings.$inferSelect): AllocationSetting | undefined {
  if (!row) return undefined;
  return {
    status: row.status,
    overhead: row.overhead,
    split: { run: row.run, fix: row.fix, sustain: row.sustain, change: row.change },
  };
}

function later(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function earlier(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}
