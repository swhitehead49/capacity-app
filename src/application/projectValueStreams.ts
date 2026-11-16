import { asc, eq } from "drizzle-orm";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";
import { listTeamsOverview, referenceChecker } from "./teams";

// A project's value streams and the teams mapped to them (sean, 15 Nov 2026). "db" is the project's database;
// "shared" holds the system's list of value streams. Teams without a value stream can be included or excluded.

export type MappingResult = { ok: true } | { ok: false; errors: string[] };

const NO_VALUE_STREAMS = "No value streams in the project";

/** The project home page: its value streams with their active teams, and the active teams without one. */
export async function getProjectMakeup(db: Db, today: string, shared: Db = db) {
  const linked = await projectStreamNames(db);
  const teams = (await listTeamsOverview(db, today)).filter((x) => !x.status.startsWith("Retired"));
  const valueStreams = linked.map((name) => {
    const inStream = teams.filter((x) => x.valueStream === name);
    return { name, teams: inStream.length, members: inStream.reduce((sum, x) => sum + x.members, 0) };
  });
  const unmapped = teams.filter((x) => !x.valueStream)
    .map(({ id, name, members, included, valueStream }) => ({ id, name, members, included, valueStream }));
  const system = (await shared.select().from(t.valueStreams).orderBy(asc(t.valueStreams.name))).map((v) => v.name);
  return { valueStreams, unmapped, canAdd: system.filter((v) => !linked.includes(v)), error: linked.length ? null : NO_VALUE_STREAMS };
}

export async function projectStreamNames(db: Pick<Db, "select">): Promise<string[]> {
  return (await db.select().from(t.projectValueStreams).orderBy(asc(t.projectValueStreams.name))).map((v) => v.name);
}

export async function linkValueStream(db: Db, actor: string, request: { name: string }, shared: Db = db): Promise<MappingResult> {
  const checked = (await referenceChecker(shared)).check({ valueStream: request.name.trim() || null });
  if (checked.errors.length) return { ok: false, errors: checked.errors };
  const name = checked.valueStream;
  if (!name) return { ok: false, errors: ["Pick a value stream"] };
  if ((await projectStreamNames(db)).includes(name)) return { ok: false, errors: [`${name} is already in the project`] };
  await db.transaction(async (tx) => {
    await tx.insert(t.projectValueStreams).values({ name });
    await tx.insert(t.auditLog).values({ actor, entity: "project_value_streams", entityId: name, action: "add", before: null, after: { name } });
  });
  return { ok: true };
}

/** Takes a value stream out of the project. Its teams keep their value stream; they just aren't in this project any more. */
export async function unlinkValueStream(db: Db, actor: string, request: { name: string }): Promise<MappingResult> {
  if (!(await projectStreamNames(db)).includes(request.name)) return { ok: false, errors: [`${request.name} is not in the project`] };
  await db.transaction(async (tx) => {
    await tx.delete(t.projectValueStreams).where(eq(t.projectValueStreams.name, request.name));
    await tx.insert(t.auditLog).values({ actor, entity: "project_value_streams", entityId: request.name, action: "remove", before: { name: request.name }, after: null });
  });
  return { ok: true };
}

/** One value stream's active teams. A team's value stream is set by the Admin in Reference data → Teams. */
export async function getValueStreamTeams(db: Db, query: { name: string; today: string }) {
  const linked = await projectStreamNames(db);
  const teams = (await listTeamsOverview(db, query.today)).filter((x) => !x.status.startsWith("Retired"));
  return { inProject: linked.includes(query.name), teams: teams.filter((x) => x.valueStream === query.name) };
}

/**
 * The project's teams (master team list, sean 15 Nov 2026): those in its value streams, plus the teams
 * without a value stream that it includes. Teams in other value streams belong to other projects.
 */
export async function listProjectTeams(db: Db, today: string, filter: { valueStream?: string; country?: string } = {}) {
  const linked = await projectStreamNames(db);
  return (await listTeamsOverview(db, today, filter)).filter((x) => (x.valueStream ? linked.includes(x.valueStream) : x.included));
}

/** A team without a value stream can be included in or excluded from the project. */
export async function setTeamIncluded(db: Db, actor: string, request: { teamId: string; included: boolean }): Promise<MappingResult> {
  const team = await db.query.teams.findFirst({ where: eq(t.teams.id, request.teamId) });
  if (!team) return { ok: false, errors: [`Unknown team ${request.teamId}`] };
  if (team.valueStream && (await projectStreamNames(db)).includes(team.valueStream)) {
    return { ok: false, errors: [`${team.id} is in ${team.valueStream}, so it is part of the project`] };
  }
  if (team.included === request.included) return { ok: true };
  await db.transaction(async (tx) => {
    await tx.update(t.teams).set({ included: request.included }).where(eq(t.teams.id, team.id));
    await tx.insert(t.auditLog).values({
      actor, entity: "teams", entityId: team.id, action: request.included ? "include" : "exclude",
      before: { included: team.included }, after: { included: request.included },
    });
  });
  return { ok: true };
}
