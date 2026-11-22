"use server";

import { redirect } from "next/navigation";
import { importMembers } from "@/src/application/importMembers";
import { today } from "@/src/infrastructure/db/appDb";
import { formProject, projectDb } from "@/app/lib/project";

// FR-05b (sean, 22 Nov 2026). v1 has one actor (decision 8 Nov 2026).
const ACTOR = "Capacity Admin";
const MAX_SHOWN = 20;

export async function importMembersAction(form: FormData) {
  const projectId = formProject(form);
  const file = form.get("file");
  const csv = file instanceof File ? await file.text() : "";
  const result = await importMembers((await projectDb(projectId)).db, ACTOR, { csv, today: today() });
  if (result.ok) redirect(`/p/${projectId}/import-members?imported=${result.count}`);
  const shown = result.errors.slice(0, MAX_SHOWN);
  if (result.errors.length > MAX_SHOWN) shown.push(`...and ${result.errors.length - MAX_SHOWN} more`);
  redirect(`/p/${projectId}/import-members?${new URLSearchParams({ error: shown.join("\n") })}`);
}
