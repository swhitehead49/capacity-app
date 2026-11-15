"use server";

import { redirect } from "next/navigation";
import { importTeams } from "@/src/application/importTeams";
import { today } from "@/src/infrastructure/db/appDb";
import { formProject, projectDb } from "@/app/lib/project";

// v1 has one actor (decision 8 Nov 2026).
const ACTOR = "Capacity Admin";
const MAX_SHOWN = 20;

/** Import teams from a CSV file (sean, 15 Nov 2026). All or nothing. */
export async function importTeamsAction(form: FormData) {
  const projectId = formProject(form);
  const file = form.get("file");
  const csv = file instanceof File ? await file.text() : "";
  const result = await importTeams((await projectDb(projectId)).db, ACTOR, { csv, today: today() });
  if (result.ok) {
    const params = new URLSearchParams({ imported: String(result.count) });
    if (result.warnings.length) params.set("warning", result.warnings.join("\n"));
    redirect(`/p/${projectId}/teams?${params}`);
  }
  const shown = result.errors.slice(0, MAX_SHOWN);
  if (result.errors.length > MAX_SHOWN) shown.push(`...and ${result.errors.length - MAX_SHOWN} more`);
  redirect(`/p/${projectId}/teams/import?${new URLSearchParams({ error: shown.join("\n") })}`);
}
