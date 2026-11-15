import { sql } from "drizzle-orm";
import { DEFAULT_PROJECT } from "../../domain/projects/projectRules";
import type { Db } from "./testDb";

// Projects (decided 15 Nov 2026): every project has its own complete set of tables, so data can never mix
// and the same team ID can be used in two projects. The list of projects is kept in the Default project's
// database, in a separate "app" schema, so it is never part of any project's own data.

export interface ProjectRow {
  id: string;
  name: string;
  createdAt: Date;
  archivedAt: Date | null;
}

/** Creates the project list if it is missing and makes sure Default is in it. Safe to run on every start. */
export async function ensureProjectRegistry(db: Db): Promise<void> {
  await db.execute(sql`create schema if not exists app`);
  await db.execute(sql`create table if not exists app.projects (
    id text primary key,
    name text not null,
    created_at timestamp not null default now(),
    archived_at timestamp
  )`);
  await db.execute(sql`insert into app.projects (id, name) values (${DEFAULT_PROJECT}, 'Default') on conflict (id) do nothing`);
}

export async function listProjects(db: Db): Promise<ProjectRow[]> {
  const result = await db.execute(sql`select id, name, created_at, archived_at from app.projects order by (id <> ${DEFAULT_PROJECT}), name`);
  return rowsOf(result).map(toProject);
}

export async function findProject(db: Db, id: string): Promise<ProjectRow | null> {
  const result = await db.execute(sql`select id, name, created_at, archived_at from app.projects where id = ${id}`);
  const [row] = rowsOf(result);
  return row ? toProject(row) : null;
}

/** Adds a project to the list. Its tables are created the first time it is opened. Check the ID with validateProject first. */
export async function insertProject(db: Db, project: { id: string; name: string }): Promise<void> {
  await db.execute(sql`insert into app.projects (id, name) values (${project.id}, ${project.name})`);
}

/** Opens each project's database the first time it is needed, then reuses it. */
export class ProjectDatabases {
  private readonly open = new Map<string, Promise<Db>>();

  constructor(private readonly opener: (projectId: string) => Promise<Db>) {}

  get(projectId: string): Promise<Db> {
    let db = this.open.get(projectId);
    if (!db) {
      db = this.opener(projectId);
      this.open.set(projectId, db);
      db.catch(() => this.open.delete(projectId)); // a failed open can be retried
    }
    return db;
  }
}

type RawRow = Record<string, unknown>;

/** PGlite and node-postgres both return `{ rows }` from execute. */
function rowsOf(result: unknown): RawRow[] {
  return (result as { rows: RawRow[] }).rows;
}

function toProject(row: RawRow): ProjectRow {
  const date = (v: unknown) => (v === null || v === undefined ? null : new Date(v as string | Date));
  return { id: String(row.id), name: String(row.name), createdAt: date(row.created_at)!, archivedAt: date(row.archived_at) };
}
