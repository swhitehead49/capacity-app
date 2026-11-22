import { asc, eq, inArray } from "drizzle-orm";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";
import { listTeamsOverview } from "./teams";

// Which value streams and teams make up a project. "db" is the project's database; "shared" holds the system's list of
// value streams. FR-18s (sean, 22 Nov 2026): the Admin sets this up in Reference data → Projects, with one rule:
// a team is in the project when its tick (teams.included) is on. Ticking a value stream ticks all its teams and
// unticking it unticks them; any single team can then be ticked or unticked on its own.

export type MappingResult = { ok: true } | { ok: false; errors: string[] };

const NO_VALUE_STREAMS = "No value streams in the project";

const active = async (db: Db, today: string) => (await listTeamsOverview(db, today)).filter((x) => !x.status.startsWith("Retired"));

export async function projectStreamNames(db: Pick<Db, "select">): Promise<string[]> {
  return (await db.select().from(t.projectValueStreams).orderBy(asc(t.projectValueStreams.name))).map((v) => v.name);
}

/** The Admin's setup page: every system value stream and every active team, each with its tick. */
export async function getProjectSetup(db: Db, today: string, shared: Db) {
  const linked = await projectStreamNames(db);
  const teams = await active(db, today);
  const system = (await shared.select().from(t.valueStreams).orderBy(asc(t.valueStreams.name))).map((v) => v.name);
  return {
    valueStreams: system.map((name) => ({ name, included: linked.includes(name), teams: teams.filter((x) => x.valueStream === name).length })),
    teams: teams.map(({ id, name, valueStream, parentTeamName, grandparentTeamName, members, included }) =>
      ({ id, name, valueStream, parentTeamName, grandparentTeamName, members, included })),
  };
}

/** Sets which value streams are in the project. A newly ticked one ticks its teams; an unticked one unticks them. */
export async function updateProjectValueStreams(
  db: Db, actor: string, request: { names: string[] }, shared: Db,
): Promise<{ ok: true; added: string[]; removed: string[] } | { ok: false; errors: string[] }> {
  const system = (await shared.select().from(t.valueStreams)).map((v) => v.name);
  const unknown = request.names.filter((n) => !system.includes(n));
  if (unknown.length) return { ok: false, errors: unknown.map((n) => `Unknown value stream ${n}`) };
  const linked = await projectStreamNames(db);
  const added = request.names.filter((n) => !linked.includes(n)).sort();
  const removed = linked.filter((n) => !request.names.includes(n));
  if (!added.length && !removed.length) return { ok: true, added, removed };

  await db.transaction(async (tx) => {
    for (const name of added) {
      await tx.insert(t.projectValueStreams).values({ name });
      await tx.insert(t.auditLog).values({ actor, entity: "project_value_streams", entityId: name, action: "add", before: null, after: { name } });
    }
    for (const name of removed) {
      await tx.delete(t.projectValueStreams).where(eq(t.projectValueStreams.name, name));
      await tx.insert(t.auditLog).values({ actor, entity: "project_value_streams", entityId: name, action: "remove", before: { name }, after: null });
    }
    const changes = [...added.map((n) => [n, true] as const), ...removed.map((n) => [n, false] as const)];
    for (const [name, include] of changes) {
      const teams = await tx.select().from(t.teams).where(eq(t.teams.valueStream, name));
      for (const team of teams.filter((x) => x.included !== include)) await setIncluded(tx, actor, team.id, include);
    }
  });
  return { ok: true, added, removed };
}

/** Sets the tick of each listed team (the teams shown on the page); the ticked ones are in the project. */
export async function updateProjectTeams(
  db: Db, actor: string, request: { teamIds: string[]; ticked: string[] },
): Promise<{ ok: true; changed: number } | { ok: false; errors: string[] }> {
  const teams = request.teamIds.length ? await db.select().from(t.teams).where(inArray(t.teams.id, request.teamIds)) : [];
  const unknown = request.teamIds.filter((id) => !teams.some((x) => x.id === id));
  if (unknown.length) return { ok: false, errors: unknown.map((id) => `Unknown team ${id}`) };
  const changes = teams.filter((x) => x.included !== request.ticked.includes(x.id));
  await db.transaction(async (tx) => {
    for (const team of changes) await setIncluded(tx, actor, team.id, !team.included);
  });
  return { ok: true, changed: changes.length };
}

async function setIncluded(tx: Pick<Db, "update" | "insert">, actor: string, teamId: string, included: boolean) {
  await tx.update(t.teams).set({ included }).where(eq(t.teams.id, teamId));
  await tx.insert(t.auditLog).values({
    actor, entity: "teams", entityId: teamId, action: included ? "include" : "exclude", before: { included: !included }, after: { included },
  });
}

/** The project's teams: the ticked ones. Retired ones stay listed so past periods can still be reported. */
export async function listProjectTeams(db: Db, today: string, filter: { valueStream?: string; country?: string } = {}) {
  return (await listTeamsOverview(db, today, filter)).filter((x) => x.included);
}

/** The manager's Project home (read-only): the project's value streams with their ticked teams, and its other ticked teams. */
export async function getProjectMakeup(db: Db, today: string) {
  const linked = await projectStreamNames(db);
  const teams = (await active(db, today)).filter((x) => x.included);
  const valueStreams = linked.map((name) => {
    const inStream = teams.filter((x) => x.valueStream === name);
    return { name, teams: inStream.length, members: inStream.reduce((sum, x) => sum + x.members, 0) };
  });
  const otherTeams = teams.filter((x) => !x.valueStream || !linked.includes(x.valueStream))
    .map(({ id, name, members, valueStream }) => ({ id, name, members, valueStream }));
  return { valueStreams, otherTeams, error: linked.length ? null : NO_VALUE_STREAMS };
}

/** One value stream's active teams, and whether each is in the project. */
export async function getValueStreamTeams(db: Db, query: { name: string; today: string }) {
  const linked = await projectStreamNames(db);
  const teams = await active(db, query.today);
  return { inProject: linked.includes(query.name), teams: teams.filter((x) => x.valueStream === query.name) };
}
