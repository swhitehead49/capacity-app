"use server";

import { redirect } from "next/navigation";
import { saveStandardAllocation } from "@/src/application/standardAllocation";
import { formProject, projectDb } from "@/app/lib/project";
import { failed, type FormState } from "@/app/lib/formState";

// v1 has one actor (decision 8 Nov 2026).
const ACTOR = "Capacity Admin";

/** Save the project's standard allocation (percentages typed as 0–100). */
export async function saveStandardAction(previous: FormState, form: FormData): Promise<FormState> {
  const projectId = formProject(form);
  const read = (name: string) => String(form.get(name) ?? "").trim();
  const fraction = (name: string) => (read(name) === "" ? null : Number(read(name)) / 100);
  const result = await saveStandardAllocation((await projectDb(projectId)).db, ACTOR, {
    overhead: fraction("overhead"),
    contingency: fraction("contingency"),
    split: {
      run: fraction("run") ?? 0, fix: fraction("fix") ?? 0, sustain: fraction("sustain") ?? 0,
      change: fraction("change") ?? 0, enabling: fraction("enabling") ?? 0,
    },
  });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/p/${projectId}/project-reference?saved=1`);
}
