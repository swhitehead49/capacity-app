import { and, asc, desc, eq, gt, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { nameClashes, sameName, validateTeam, type TeamDraft } from "../domain/organisation/teamRules";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";

// UC15 add, UC16 rename, UC17 retire (FR-18, BR-15 to BR-20, BR-23). Nothing is ever deleted; every change is logged.

export type TeamResult = { ok: true; id: string; warnings: string[] } | { ok: false; errors: string[] };

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const formatDay = (date: string) => day.format(new Date(`${date}T00:00:00Z`));

/** UC15: a new team with a permanent ID, its first name, and a Draft default (BR-17). */
export async function addTeam(db: Db, actor: string, draft: TeamDraft): Promise<TeamResult> {
  const team = { ...draft, id: draft.id.trim(), name: draft.name.trim(), valueStream: draft.valueStream?.trim() || null, leadEmail: draft.leadEmail?.trim() || null };
  const errors = validateTeam(team);
  if (errors.length) return { ok: false, errors };
  if (await db.query.teams.findFirst({ where: eq(t.teams.id, team.id) })) {
    return { ok: false, errors: [`Team ID ${team.id} is already used`] };
  }
  const clash = nameClashes(team.name, team.valueStream, await liveTeams(db));
  if (clash.errors.length) return { ok: false, errors: clash.errors };

  await db.transaction(async (tx) => {
    const [row] = await tx.insert(t.teams).values({
      id: team.id, name: team.name, valueStream: team.valueStream, leadEmail: team.leadEmail,
    }).returning();
    await tx.insert(t.teamNameHistory).values({ teamId: team.id, name: team.name, effectiveFrom: team.effectiveFrom });
    await tx.insert(t.allocationSettings).values({
      teamId: team.id, level: "Team default", status: "Draft", effectiveFrom: null, overhead: null,
      run: 0, fix: 0, sustain: 0, change: 0, reason: "Created with the team", owner: actor,
    });
    await tx.insert(t.auditLog).values({
      actor, entity: "teams", entityId: team.id, action: "add", reason: `Team starts ${team.effectiveFrom}`, before: null, after: row,
    });
  });
  return { ok: true, id: team.id, warnings: clash.warnings };
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

  const a = t.assignments;
  const stillOn = await db.select({ email: a.personEmail }).from(a)
    .where(and(eq(a.teamId, team.id), or(isNull(a.endDate), gt(a.endDate, request.retiredOn))))
    .orderBy(asc(a.personEmail));
  if (stillOn.length) return { ok: false, errors: [`Move or end these members first: ${stillOn.map((m) => m.email).join(", ")}`] };

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

/** FR-19: every team, its status today and how many people are on it now. */
export async function listTeamsOverview(db: Db, today: string) {
  const a = t.assignments;
  const counts = await db.select({ teamId: a.teamId, n: sql<number>`count(*)::int` }).from(a)
    .where(and(or(isNull(a.startDate), lte(a.startDate, today)), or(isNull(a.endDate), sql`${a.endDate} >= ${today}`)))
    .groupBy(a.teamId);
  const teams = await db.select().from(t.teams).orderBy(asc(t.teams.id));
  return teams.map((team) => ({
    ...team,
    status: teamStatus(team.retiredOn, today),
    members: counts.find((c) => c.teamId === team.id)?.n ?? 0,
  }));
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

async function liveTeams(db: Db) {
  return db.select({ id: t.teams.id, name: t.teams.name, valueStream: t.teams.valueStream }).from(t.teams).where(isNull(t.teams.retiredOn));
}
