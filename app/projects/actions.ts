"use server";

import { redirect } from "next/navigation";
import { archiveProject, createProject, renameProject, restoreProject } from "@/src/application/projects";
import { getDb } from "@/src/infrastructure/db/appDb";
import { failed, type FormState } from "@/app/lib/formState";

// v1 has one actor (decision 8 Nov 2026).
const ACTOR = "Capacity Admin";
const read = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

/** Step 4: a new project opens on its (empty) Teams page. */
export async function createProjectAction(previous: FormState, form: FormData): Promise<FormState> {
  const result = await createProject(await getDb(), ACTOR, { name: read(form, "name") });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/reference/projects?created=${encodeURIComponent(read(form, "name").trim())}`);
}

export async function renameProjectAction(previous: FormState, form: FormData): Promise<FormState> {
  const result = await renameProject(await getDb(), ACTOR, { id: read(form, "projectId"), name: read(form, "name") });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/p/${result.id}/project-reference`);
}

export async function archiveProjectAction(form: FormData) {
  await archiveProject(await getDb(), ACTOR, { id: read(form, "projectId") });
  redirect("/projects");
}

export async function restoreProjectAction(form: FormData) {
  await restoreProject(await getDb(), ACTOR, { id: read(form, "projectId") });
  redirect("/projects");
}
