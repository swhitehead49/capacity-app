import { notFound } from "next/navigation";
import { getDb, getProjectDb } from "@/src/infrastructure/db/appDb";
import { findProject } from "@/src/infrastructure/db/projectDatabases";

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
