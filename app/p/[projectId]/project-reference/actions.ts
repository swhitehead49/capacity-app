"use server";

import { redirect } from "next/navigation";
import { saveStandardAllocation, useSystemStandard } from "@/src/application/standardAllocation";
import { formProject, projectDb } from "@/app/lib/project";
import { readStandardForm } from "@/app/lib/standardValues";
import { failed, type FormState } from "@/app/lib/formState";

// v1 has one actor (decision 8 Nov 2026).
const ACTOR = "Capacity Admin";

/** Save the project's own standard allocation (percentages typed as 0–100). */
export async function saveStandardAction(previous: FormState, form: FormData): Promise<FormState> {
  const projectId = formProject(form);
  const result = await saveStandardAllocation((await projectDb(projectId)).db, ACTOR, readStandardForm(form));
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/p/${projectId}/project-reference?saved=1`);
}

/** Drop the project's own standard and go back to the system one. */
export async function backToSystemStandardAction(form: FormData) {
  const projectId = formProject(form);
  await useSystemStandard((await projectDb(projectId)).db, ACTOR);
  redirect(`/p/${projectId}/project-reference`);
}
