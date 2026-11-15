import { DEFAULT_PROJECT, projectIdFromName, validateProject } from "../domain/projects/projectRules";
import { sameName } from "../domain/organisation/teamRules";
import { findProject, insertProject, listProjects, updateProject } from "../infrastructure/db/projectDatabases";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";

// Projects, step 4 (sean, 15 Nov 2026): create, rename, archive and restore. Nothing is ever deleted.
// `db` is the Default project's database, which holds the list of projects and logs these changes.
// A new project's own tables are created the first time it is opened.

export type ProjectResult = { ok: true; id: string } | { ok: false; errors: string[] };

async function nameTaken(db: Db, name: string, exceptId?: string): Promise<string[]> {
  const clash = (await listProjects(db)).find((p) => p.id !== exceptId && sameName(p.name, name));
  return clash ? [`There is already a project called "${clash.name}"`] : [];
}

async function log(db: Db, actor: string, id: string, action: string, before: unknown, after: unknown) {
  await db.insert(t.auditLog).values({ actor, entity: "projects", entityId: id, action, before, after });
}

export async function createProject(db: Db, actor: string, request: { name: string }): Promise<ProjectResult> {
  const name = request.name.trim();
  if (!name) return { ok: false, errors: ["Project name is needed"] };
  const taken = await nameTaken(db, name);
  if (taken.length) return { ok: false, errors: taken };
  const id = projectIdFromName(name, (await listProjects(db)).map((p) => p.id));
  const errors = validateProject({ id, name });
  if (errors.length) return { ok: false, errors };
  await insertProject(db, { id, name });
  await log(db, actor, id, "add", null, { id, name });
  return { ok: true, id };
}

export async function renameProject(db: Db, actor: string, request: { id: string; name: string }): Promise<ProjectResult> {
  const name = request.name.trim();
  const project = await findProject(db, request.id);
  if (!project) return { ok: false, errors: ["This project no longer exists"] };
  if (!name) return { ok: false, errors: ["Project name is needed"] };
  const taken = await nameTaken(db, name, project.id);
  if (taken.length) return { ok: false, errors: taken };
  await updateProject(db, project.id, { name });
  await log(db, actor, project.id, "rename", { name: project.name }, { name });
  return { ok: true, id: project.id };
}

/** Hides the project from the picker. Its data is kept, and it can be restored. */
export async function archiveProject(db: Db, actor: string, request: { id: string }): Promise<ProjectResult> {
  if (request.id === DEFAULT_PROJECT) return { ok: false, errors: ["The Default project can't be archived"] };
  const project = await findProject(db, request.id);
  if (!project) return { ok: false, errors: ["This project no longer exists"] };
  await updateProject(db, project.id, { archived: true });
  await log(db, actor, project.id, "archive", null, null);
  return { ok: true, id: project.id };
}

export async function restoreProject(db: Db, actor: string, request: { id: string }): Promise<ProjectResult> {
  const project = await findProject(db, request.id);
  if (!project) return { ok: false, errors: ["This project no longer exists"] };
  await updateProject(db, project.id, { archived: false });
  await log(db, actor, project.id, "restore", null, null);
  return { ok: true, id: project.id };
}
