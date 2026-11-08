import { asc } from "drizzle-orm";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";

/** Choices for drop-downs: every location and team, as value + label. */
export async function listLocations(db: Db) {
  const rows = await db.select().from(t.locations).orderBy(asc(t.locations.code));
  return rows.map((l) => ({ value: l.code, label: l.name === l.code ? l.code : `${l.code} | ${l.name}` }));
}

export async function listTeams(db: Db) {
  const rows = await db.select().from(t.teams).orderBy(asc(t.teams.id));
  return rows.map((team) => ({ value: team.id, label: `${team.id} | ${team.name}` }));
}
