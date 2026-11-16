import { asc, eq, sql } from "drizzle-orm";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";
import { syncLocations } from "./referenceData";
import { resolveStandard } from "./standardAllocation";
import { firstDefault } from "./teams";

// Master team list (sean, 15 Nov 2026). The Admin keeps every team once, in the shared (Default) database.
// Each project holds a copy of every team, kept up to date here, because its members, allocations and plans refer to it.
// Which teams are in a project is the project's own choice (its value streams, and included teams without one),
// as is retiring a team in it; those are never overwritten.

/** The team attributes that come from the master list. */
const MASTER_FIELDS = [
  "name", "leadEmail", "valueStream", "baseLocation", "parentTeamName", "parentTeamLeadEmail", "grandparentTeamName",
  "grandparentTeamLeadEmail", "topLevelGroup", "topLevelLeadEmail", "sourceHeadcount", "idStatus", "dataQualityFlag",
] as const;

type TeamRow = typeof t.teams.$inferSelect;
type NameRow = { teamId: string; name: string; effectiveFrom: string | null };

const pick = (team: TeamRow) => Object.fromEntries(MASTER_FIELDS.map((k) => [k, team[k]])) as Pick<TeamRow, (typeof MASTER_FIELDS)[number]>;
const historyKey = (rows: NameRow[]) => JSON.stringify(rows.map((n) => [n.name, n.effectiveFrom]).sort());

async function namesByTeam(db: Pick<Db, "select">): Promise<Map<string, NameRow[]>> {
  const h = t.teamNameHistory;
  const rows = await db.select({ teamId: h.teamId, name: h.name, effectiveFrom: h.effectiveFrom }).from(h).orderBy(asc(h.id));
  const map = new Map<string, NameRow[]>();
  for (const row of rows) map.set(row.teamId, [...(map.get(row.teamId) ?? []), row]);
  return map;
}

/** The team's start: the date of its first name. */
const startOf = (names: NameRow[]) => names.map((n) => n.effectiveFrom).filter((d): d is string => !!d).sort()[0] ?? null;

/** Two pages of a project can open at the same time; only one of them syncs at once. */
const lock = (tx: Pick<Db, "execute">) => tx.execute(sql`select pg_advisory_xact_lock(hashtext('capacity-app sync teams'))`);

/** Brings the project's copies of the master teams up to date. The Default project holds the master list itself. */
export async function syncTeams(project: Db, shared: Db, today: string, actor = "Capacity Admin"): Promise<void> {
  if (project === shared) return;
  await syncLocations(project, shared);
  const quick = plan(await shared.select().from(t.teams), await project.select().from(t.teams), new Map(), new Map(), true);
  if (!quick.newcomers.length && !quick.missing.length && !quick.changed.length && !(await namesDiffer(project, shared))) return;

  // Never read one database inside the other's transaction: two pages syncing at once would wait for each other forever.
  // Teams that so far only exist in this project join the master list, left out of other projects.
  const local = await project.select().from(t.teams);
  const localNames = await namesByTeam(project);
  await shared.transaction(async (tx) => {
    await lock(tx);
    const master = await tx.select().from(t.teams);
    for (const team of local.filter((x) => !master.some((m) => m.id === x.id))) {
      const [row] = await tx.insert(t.teams).values({ ...team, included: false, retiredOn: null }).onConflictDoNothing().returning();
      if (!row) continue;
      const names = localNames.get(team.id) ?? [{ teamId: team.id, name: team.name, effectiveFrom: null }];
      await tx.insert(t.teamNameHistory).values(names.map(({ teamId, name, effectiveFrom }) => ({ teamId, name, effectiveFrom })));
      await tx.insert(t.allocationSettings).values(firstDefault(team.id, null, null, actor));
      await tx.insert(t.auditLog).values({ actor, entity: "teams", entityId: team.id, action: "add to master list", before: null, after: row });
    }
  });

  const standard = (await resolveStandard(project, shared))?.standard ?? null;
  const master = await shared.select().from(t.teams);
  const masterNames = await namesByTeam(shared);
  await project.transaction(async (tx) => {
    await lock(tx);
    const { missing, changed, renamed } = plan(master, await tx.select().from(t.teams), masterNames, await namesByTeam(tx), false);
    for (const team of missing) {
      // A team without a value stream starts excluded, so it doesn't turn up in every project.
      const [row] = await tx.insert(t.teams).values({ ...team, included: team.valueStream !== null, retiredOn: null }).onConflictDoNothing().returning();
      if (!row) continue;
      const names = masterNames.get(team.id) ?? [];
      if (names.length) await tx.insert(t.teamNameHistory).values(names.map(({ teamId, name, effectiveFrom }) => ({ teamId, name, effectiveFrom })));
      await tx.insert(t.allocationSettings).values(firstDefault(team.id, startOf(names) ?? today, standard, actor));
    }
    for (const team of changed) await tx.update(t.teams).set(pick(team)).where(eq(t.teams.id, team.id));
    for (const team of renamed) {
      await tx.delete(t.teamNameHistory).where(eq(t.teamNameHistory.teamId, team.id));
      const names = masterNames.get(team.id) ?? [];
      if (names.length) await tx.insert(t.teamNameHistory).values(names.map(({ teamId, name, effectiveFrom }) => ({ teamId, name, effectiveFrom })));
    }
  });
}

/** What differs between the master list and the project's copies. */
function plan(master: TeamRow[], local: TeamRow[], masterNames: Map<string, NameRow[]>, localNames: Map<string, NameRow[]>, skipNames: boolean) {
  const inLocal = (id: string) => local.find((x) => x.id === id);
  return {
    newcomers: local.filter((x) => !master.some((m) => m.id === x.id)),
    missing: master.filter((m) => !inLocal(m.id)),
    changed: master.filter((m) => { const copy = inLocal(m.id); return copy && JSON.stringify(pick(copy)) !== JSON.stringify(pick(m)); }),
    renamed: skipNames ? [] : master.filter((m) => inLocal(m.id)
      && historyKey(masterNames.get(m.id) ?? []) !== historyKey(localNames.get(m.id) ?? [])),
  };
}

/** Whether any shared team's name history differs from the project's copy. */
async function namesDiffer(project: Db, shared: Db): Promise<boolean> {
  const [mine, theirs] = [await namesByTeam(project), await namesByTeam(shared)];
  return [...theirs].some(([id, names]) => mine.has(id) && historyKey(names) !== historyKey(mine.get(id) ?? []));
}
