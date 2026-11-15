import { notFound } from "next/navigation";
import { getDb, getProjectDb } from "@/src/infrastructure/db/appDb";
import { findProject, listProjects } from "@/src/infrastructure/db/projectDatabases";

/** The project named in the web address and its database. An unknown project shows "not found". */
export async function projectDb(projectId: string) {
  const project = await findProject(await getDb(), projectId);
  if (!project) notFound();
  return { project, db: await getProjectDb(projectId) };
}

/** Reads the project a form belongs to (every form sends it as a hidden field). */
export function formProject(form: FormData): string {
  return String(form.get("projectId") ?? "");
}

/** What all projects share (sean, 15 Nov 2026): the sprint calendar and the country holiday calendars. */
export function sharedDb() {
  return getDb();
}

/** Every open project's database, e.g. to see which countries any project has people in. */
export async function openProjectDbs() {
  const projects = (await listProjects(await getDb())).filter((p) => p.archivedAt === null);
  return Promise.all(projects.map((p) => getProjectDb(p.id)));
}
