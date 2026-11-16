"use server";

import { redirect } from "next/navigation";
import { retireTeam } from "@/src/application/teams";
import { formProject, projectDb } from "@/app/lib/project";
import { failed, type FormState } from "@/app/lib/formState";

// v1 has one actor (decision 8 Nov 2026). Team details are edited by the Admin in the master team list
// (Reference data → Teams, sean 15 Nov 2026); retiring a team stays with the project, which owns its members.
const ACTOR = "Capacity Admin";
const read = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

export async function retireTeamAction(previous: FormState, form: FormData): Promise<FormState> {
  const projectId = formProject(form);
  const teamId = read(form, "teamId");
  const result = await retireTeam((await projectDb(projectId)).db, ACTOR, {
    teamId, retiredOn: read(form, "retiredOn"), successorTeamIds: form.getAll("successors").map(String),
  });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/p/${projectId}/teams/${teamId}/manage`);
}
