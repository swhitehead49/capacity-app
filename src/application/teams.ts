import { readBaseCountry } from "../domain/organisation/baseCountry";
import { and, asc, desc, eq, gt, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { TEAM_DETAIL_FIELDS, emptyTeamDetails, looksLikeEmail, validateTeamDetails, type TeamDetails } from "../domain/organisation/teamDetails";
import { IMPORTED_REASON } from "../domain/organisation/startingAllocation";
import { definedOnly, nameClashes, sameName, validateTeam, type TeamDraft } from "../domain/organisation/teamRules";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";
import { getReferenceData, syncLocations } from "./referenceData";
import { resolveStandard, type StandardAllocation } from "./standardAllocation";

// UC15 add, UC16 rename, UC17 retire (FR-18, BR-15 to BR-20, BR-23). Nothing is ever deleted; every change is logged.

export type TeamResult = { ok: true; id: string; warnings: string[] } | { ok: false; errors: string[] };

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const formatDay = (date: string) => day.format(new Date(`${date}T00:00:00Z`));

/**
 * UC15: a new team with a permanent ID, its first name, and the project's standard allocation (or a Draft default, BR-17).
 * Its value stream and base location come from the system's reference data in "shared" (sean, 15 Nov 2026).
 */
export async function addTeam(db: Db, actor: string, draft: TeamDraft, shared: Db = db): Promise<TeamResult> {
  const team = {
    ...draft, id: draft.id.trim(), name: draft.name.trim(), valueStream: draft.valueStream?.trim() || null,
    leadEmail: draft.leadEmail?.trim() || null, baseLocation: draft.baseLocation?.trim() || null,
  };
  const errors = validateTeam(team);
  if (errors.length) return { ok: false, errors };
  const reference = await referenceChecker(shared);
  const checked = reference.check(team);
  if (checked.errors.length) return { ok: false, errors: checked.errors };
  team.valueStream = checked.valueStream;
  team.baseLocation = checked.baseLocation;
  if (await db.query.teams.findFirst({ where: eq(t.teams.id, team.id) })) {
    return { ok: false, errors: [`Team ID ${team.id} is already used`] };
  }
  const clash = nameClashes(team.name, team.valueStream, await liveTeams(db));
  if (clash.errors.length) return { ok: false, errors: clash.errors };

  const standard = (await resolveStandard(db, shared))?.standard ?? null;
  if (team.baseLocation) await syncLocations(db, shared);
  await db.transaction((tx) => insertTeam(tx, actor, team, standard));
  return { ok: true, id: team.id, warnings: clash.warnings };
}

/** Saves one new team (already checked): the team, its first name, its first default and the audit log. */
export async function insertTeam(
  tx: Pick<Db, "insert" | "select">, actor: string, team: TeamDraft & { valueStream: string | null; leadEmail: string | null },
  standard: StandardAllocation | null,
): Promise<void> {
    const included = await inProjectStream(tx, team.valueStream);
    const [row] = await tx.insert(t.teams).values({
      id: team.id, name: team.name, valueStream: team.valueStream, leadEmail: team.leadEmail, baseLocation: team.baseLocation ?? null, included,
      ...emptyTeamDetails(), ...definedOnly(pickDetails(team)),
    }).returning();
    await tx.insert(t.teamNameHistory).values({ teamId: team.id, name: team.name, effectiveFrom: team.effectiveFrom });
    // FR-18x: an imported team may bring its own starting allocation; otherwise it takes the standard.
    await tx.insert(t.allocationSettings).values(team.allocation
      ? firstDefault(team.id, team.effectiveFrom, team.allocation, actor, IMPORTED_REASON)
      : firstDefault(team.id, team.effectiveFrom, standard, actor));
  await tx.insert(t.auditLog).values({
    actor, entity: "teams", entityId: team.id, action: "add", reason: `Team starts ${team.effectiveFrom}`, before: null, after: row,
  });
}

/**
 * A new team's first default: the standard allocation in force from its start date (sean, 15 Nov 2026),
 * or with no standard (or no start date) a Draft default, so the planner shows calendar capacity only (BR-17).
 */
export function firstDefault(
  teamId: string, effectiveFrom: string | null, standard: StandardAllocation | null, actor: string, reason = "Standard allocation",
): typeof t.allocationSettings.$inferInsert {
  return standard && effectiveFrom
    ? {
      teamId, level: "Team default", status: "Active", effectiveFrom,
      overhead: standard.overhead, contingency: standard.contingency, ...standard.split,
      reason, owner: actor,
    }
    : {
      teamId, level: "Team default", status: "Draft", effectiveFrom: null, overhead: null,
      run: 0, fix: 0, sustain: 0, change: 0, reason: "Created with the team", owner: actor,
    };
}

/** UC16: a new name from a date. The ID, members and settings don't change; old names are kept (BR-20). */
export async function renameTeam(db: Db, actor: string, request: { teamId: string; name: string; effectiveFrom: string }): Promise<TeamResult> {
  const name = request.name.trim();
  const team = await db.query.teams.findFirst({ where: eq(t.teams.id, request.teamId) });
  if (!team) return { ok: false, errors: [`Unknown team ${request.teamId}`] };
  if (!name) return { ok: false, errors: ["Name is needed"] };
  if (!request.effectiveFrom) return { ok: false, errors: ["Date is needed"] };
  if (sameName(name, team.name)) return { ok: false, errors: ["That is already the team's name"] };
  const clash = nameClashes(name, team.valueStream, (await liveTeams(db)).filter((o) => o.id !== team.id));
  if (clash.errors.length) return { ok: false, errors: clash.errors };

  await db.transaction(async (tx) => {
    const history = await tx.select().from(t.teamNameHistory).where(eq(t.teamNameHistory.teamId, team.id));
    if (history.length === 0) await tx.insert(t.teamNameHistory).values({ teamId: team.id, name: team.name, effectiveFrom: null });
    await tx.insert(t.teamNameHistory).values({ teamId: team.id, name, effectiveFrom: request.effectiveFrom });
    await tx.update(t.teams).set({ name }).where(eq(t.teams.id, team.id));
    await tx.insert(t.auditLog).values({
      actor, entity: "teams", entityId: team.id, action: "rename", reason: `New name from ${request.effectiveFrom}`,
      before: { name: team.name }, after: { name },
    });
  });
  return { ok: true, id: team.id, warnings: clash.warnings };
}

/** BR-18: the people still on a team after its last day. */
export async function membersStillOn(db: Pick<Db, "select">, teamId: string, lastDay: string): Promise<string[]> {
  const a = t.assignments;
  const rows = await db.select({ email: a.personEmail }).from(a)
    .where(and(eq(a.teamId, teamId), or(isNull(a.endDate), gt(a.endDate, lastDay))))
    .orderBy(asc(a.personEmail));
  return rows.map((r) => r.email);
}

/**
 * UC17: retire a team from its last day. Only once nobody is on it after that day (BR-18).
 * Settings that start after that day are retired; earlier ones stay so past periods still report (BR-19).
 */
export async function retireTeam(
  db: Db,
  actor: string,
  request: { teamId: string; retiredOn: string; successorTeamIds: string[] },
): Promise<TeamResult> {
  const team = await db.query.teams.findFirst({ where: eq(t.teams.id, request.teamId) });
  if (!team) return { ok: false, errors: [`Unknown team ${request.teamId}`] };
  if (team.retiredOn) return { ok: false, errors: [`${team.id} is already retired`] };
  if (!request.retiredOn) return { ok: false, errors: ["Last day is needed"] };
  const successors = [...new Set(request.successorTeamIds.filter(Boolean))];
  if (successors.includes(team.id)) return { ok: false, errors: ["A team can't succeed itself"] };
  for (const id of successors) {
    if (!(await db.query.teams.findFirst({ where: eq(t.teams.id, id) }))) return { ok: false, errors: [`Unknown successor team ${id}`] };
  }

  const stillOn = await membersStillOn(db, team.id, request.retiredOn);
  if (stillOn.length) return { ok: false, errors: [`Move or end these members first: ${stillOn.join(", ")}`] };

  await db.transaction(async (tx) => {
    const s = t.allocationSettings;
    const laterPeriods = tx.select({ id: t.planningPeriods.id }).from(t.planningPeriods).where(gt(t.planningPeriods.startDate, request.retiredOn));
    const retiredSettings = await tx.update(s).set({ status: "Retired" }).where(and(
      eq(s.teamId, team.id), ne(s.status, "Retired"),
      or(
        and(eq(s.level, "Team default"), gt(s.effectiveFrom, request.retiredOn)),
        and(ne(s.level, "Team default"), inArray(s.periodId, laterPeriods)),
      ),
    )).returning({ id: s.id });
    const [after] = await tx.update(t.teams).set({ retiredOn: request.retiredOn }).where(eq(t.teams.id, team.id)).returning();
    if (successors.length) await tx.insert(t.teamSuccessors).values(successors.map((successorTeamId) => ({ teamId: team.id, successorTeamId })));
    await tx.insert(t.auditLog).values({
      actor, entity: "teams", entityId: team.id, action: "retire",
      reason: `Retired after ${request.retiredOn}${successors.length ? `; replaced by ${successors.join(", ")}` : ""}`,
      before: team, after: { ...after, successors, retiredSettings: retiredSettings.map((r) => r.id) },
    });
  });
  return { ok: true, id: team.id, warnings: [] };
}

/** FR-18s: a team is ticked into a project when the project has its value stream. */
async function inProjectStream(tx: Pick<Db, "select">, valueStream: string | null): Promise<boolean> {
  if (!valueStream) return false;
  return (await tx.select().from(t.projectValueStreams)).some((v) => v.name === valueStream);
}

/** FR-01: move a team to another value stream (the level just above it). Blank = none. */
export async function changeValueStream(db: Db, actor: string, request: { teamId: string; valueStream: string }, shared: Db = db): Promise<TeamResult> {
  const team = await db.query.teams.findFirst({ where: eq(t.teams.id, request.teamId) });
  if (!team) return { ok: false, errors: [`Unknown team ${request.teamId}`] };
  const checked = (await referenceChecker(shared)).check({ valueStream: request.valueStream.trim() || null });
  if (checked.errors.length) return { ok: false, errors: checked.errors };
  const valueStream = checked.valueStream;
  if (sameName(valueStream ?? "", team.valueStream ?? "")) {
    return { ok: false, errors: [`${team.id} is already in ${team.valueStream ?? "no value stream"}`] };
  }
  const clash = nameClashes(team.name, valueStream, (await liveTeams(db)).filter((o) => o.id !== team.id));
  if (clash.errors.length) return { ok: false, errors: clash.errors };

  await db.transaction(async (tx) => {
    // FR-18s: the project's value stream ticks apply again (this is the master list, i.e. the Default project).
    await tx.update(t.teams).set({ valueStream, included: await inProjectStream(tx, valueStream) }).where(eq(t.teams.id, team.id));
    await tx.insert(t.auditLog).values({
      actor, entity: "teams", entityId: team.id, action: "change value stream",
      before: { valueStream: team.valueStream }, after: { valueStream },
    });
  });
  return { ok: true, id: team.id, warnings: clash.warnings };
}

/** Where the team is based: a country (sean, 15 Nov 2026; country only since 22 Nov, FR-18t). Blank = not set. Members keep their own location for public holidays. */
export async function changeBaseLocation(db: Db, actor: string, request: { teamId: string; baseLocation: string }, shared: Db = db): Promise<TeamResult> {
  const team = await db.query.teams.findFirst({ where: eq(t.teams.id, request.teamId) });
  if (!team) return { ok: false, errors: [`Unknown team ${request.teamId}`] };
  const checked = (await referenceChecker(shared)).check({ baseLocation: request.baseLocation });
  if (checked.errors.length) return { ok: false, errors: checked.errors };
  const baseLocation = checked.baseLocation;
  if (baseLocation === team.baseLocation) {
    return { ok: false, errors: [baseLocation ? `${team.id} is already based in ${baseLocation}` : `${team.id} has no base location already`] };
  }
  if (baseLocation) await syncLocations(db, shared);
  await db.transaction(async (tx) => {
    await tx.update(t.teams).set({ baseLocation }).where(eq(t.teams.id, team.id));
    await tx.insert(t.auditLog).values({
      actor, entity: "teams", entityId: team.id, action: "change base location",
      before: { baseLocation: team.baseLocation }, after: { baseLocation },
    });
  });
  return { ok: true, id: team.id, warnings: [] };
}

/**
 * Checks a value stream and base location against the system's reference data (sean, 15 Nov 2026).
 * A value stream is matched ignoring capitals and comes back spelt as in the reference data.
 */
export async function referenceChecker(shared: Db) {
  const { valueStreams, locations } = await getReferenceData(shared);
  return {
    check(team: { valueStream?: string | null; baseLocation?: string | null }) {
      const errors: string[] = [];
      // FR-18t: a team's base location is a country; a region location code becomes its country.
      const base = readBaseCountry(team.baseLocation, locations);
      const baseLocation = "country" in base ? base.country : null;
      if ("error" in base) errors.push(base.error);
      let valueStream = team.valueStream ?? null;
      if (valueStream) {
        const match = valueStreams.find((v) => sameName(v, valueStream ?? ""));
        if (match) valueStream = match;
        else errors.push(`Unknown value stream ${valueStream}: add it under Reference data first`);
      }
      return { errors, valueStream, baseLocation };
    },
  };
}

/** The workbook attributes and lead email (sean, 15 Nov 2026). Only what changed goes in the audit log. */
export async function updateTeamDetails(
  db: Db, actor: string, request: { teamId: string; leadEmail: string | null } & TeamDetails,
): Promise<TeamResult> {
  const team = await db.query.teams.findFirst({ where: eq(t.teams.id, request.teamId) });
  if (!team) return { ok: false, errors: [`Unknown team ${request.teamId}`] };
  const next = { leadEmail: request.leadEmail, ...pickDetails(request) } as Record<string, unknown>;
  const errors = validateTeamDetails(pickDetails(request) as TeamDetails);
  if (request.leadEmail && !looksLikeEmail(request.leadEmail)) errors.unshift("Lead email must look like name@company.com");
  if (errors.length) return { ok: false, errors };
  const current = team as Record<string, unknown>;
  const changed = Object.keys(next).filter((k) => (current[k] ?? null) !== (next[k] ?? null));
  if (!changed.length) return { ok: false, errors: ["Nothing has changed"] };
  await db.transaction(async (tx) => {
    await tx.update(t.teams).set(next).where(eq(t.teams.id, team.id));
    await tx.insert(t.auditLog).values({
      actor, entity: "teams", entityId: team.id, action: "change details",
      before: Object.fromEntries(changed.map((k) => [k, current[k] ?? null])),
      after: Object.fromEntries(changed.map((k) => [k, next[k] ?? null])),
    });
  });
  return { ok: true, id: team.id, warnings: [] };
}

function pickDetails(source: Partial<TeamDetails>): Partial<TeamDetails> {
  return Object.fromEntries(TEAM_DETAIL_FIELDS.map((k) => [k, source[k]])) as Partial<TeamDetails>;
}

/** The value streams teams are in today, for filters and suggestions. */
export async function listValueStreams(db: Db): Promise<string[]> {
  const rows = await db.selectDistinct({ v: t.teams.valueStream }).from(t.teams).orderBy(asc(t.teams.valueStream));
  return rows.flatMap((r) => (r.v ? [r.v] : []));
}

/** Memberships that are running on `today`. */
const currentOn = (today: string) => {
  const a = t.assignments;
  return and(or(isNull(a.startDate), lte(a.startDate, today)), or(isNull(a.endDate), sql`${a.endDate} >= ${today}`));
};

/** FR-18w (sean, 22 Nov 2026): a team's headcount = the people on it today in this project. */
export async function teamHeadcount(db: Pick<Db, "select">, teamId: string, today: string): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(t.assignments).where(and(eq(t.assignments.teamId, teamId), currentOn(today)));
  return row?.n ?? 0;
}

/** FR-19: every team, its status today and how many people are on it now. Optionally one value stream only. */
export async function listTeamsOverview(db: Db, today: string, filter: { valueStream?: string; country?: string } = {}) {
  const a = t.assignments;
  const current = currentOn(today);
  const counts = await db.select({ teamId: a.teamId, n: sql<number>`count(*)::int` }).from(a).where(current).groupBy(a.teamId);
  const teams = await db.select().from(t.teams)
    .where(filter.valueStream ? eq(t.teams.valueStream, filter.valueStream) : undefined)
    .orderBy(asc(t.teams.id));
  return teams
    .map((team) => ({
      ...team,
      status: teamStatus(team.retiredOn, today),
      members: counts.find((c) => c.teamId === team.id)?.n ?? 0,
      // Country of the team's base location (sean, 15 Nov 2026: filter teams by country).
      baseCountry: team.baseLocation, // FR-18t: the base location is the country
    }))
    .filter((team) => !filter.country || team.baseCountry === filter.country);
}

/** The countries of the project's locations, for the country filter. */
export async function listTeamCountries(db: Db): Promise<string[]> {
  const rows = await db.selectDistinct({ country: t.locations.country }).from(t.locations).orderBy(asc(t.locations.country));
  return rows.map((r) => r.country);
}

/** One team for the Manage page: details, name history (newest first) and successors. */
export async function getTeamDetails(db: Db, query: { teamId: string; today: string }) {
  const team = await db.query.teams.findFirst({ where: eq(t.teams.id, query.teamId) });
  if (!team) throw new Error(`Unknown team ${query.teamId}`);
  const h = t.teamNameHistory;
  const names = await db.select({ name: h.name, effectiveFrom: h.effectiveFrom }).from(h)
    .where(eq(h.teamId, team.id)).orderBy(sql`${h.effectiveFrom} desc nulls last`, desc(h.id));
  const successors = await db.select({ id: t.teams.id, name: t.teams.name }).from(t.teamSuccessors)
    .innerJoin(t.teams, eq(t.teamSuccessors.successorTeamId, t.teams.id))
    .where(eq(t.teamSuccessors.teamId, team.id));
  return { team, status: teamStatus(team.retiredOn, query.today), names: names.length ? names : [{ name: team.name, effectiveFrom: null }], successors };
}

function teamStatus(retiredOn: string | null, today: string): string {
  if (!retiredOn) return "Active";
  return retiredOn < today ? `Retired ${formatDay(retiredOn)}` : `Retiring ${formatDay(retiredOn)}`;
}

export async function liveTeams(db: Db) {
  return db.select({ id: t.teams.id, name: t.teams.name, valueStream: t.teams.valueStream }).from(t.teams).where(isNull(t.teams.retiredOn));
}
