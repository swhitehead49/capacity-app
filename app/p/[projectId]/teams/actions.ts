"use server";

import { redirect } from "next/navigation";
import { readHeadcount } from "@/src/domain/organisation/teamDetails";
import { addTeam, changeBaseLocation, changeValueStream, updateTeamDetails, renameTeam, retireTeam } from "@/src/application/teams";
import { formProject, projectDb, sharedDb } from "@/app/lib/project";
import { failed, type FormState } from "@/app/lib/formState";

// v1 has one actor (decision 8 Nov 2026).
const ACTOR = "Capacity Admin";
const read = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

/** UC15. Warnings (same name under another parent) are shown on the Teams list. */
export async function addTeamAction(previous: FormState, form: FormData): Promise<FormState> {
  const projectId = formProject(form);
  const result = await addTeam((await projectDb(projectId)).db, ACTOR, {
    id: read(form, "id"), name: read(form, "name"), valueStream: read(form, "valueStream") || null,
    leadEmail: read(form, "leadEmail") || null, baseLocation: read(form, "baseLocation") || null, effectiveFrom: read(form, "effectiveFrom"),
  }, await sharedDb());
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/p/${projectId}/teams${result.warnings.length ? `?${new URLSearchParams({ warning: result.warnings.join("\n") })}` : ""}`);
}

export async function renameTeamAction(previous: FormState, form: FormData): Promise<FormState> {
  const projectId = formProject(form);
  const teamId = read(form, "teamId");
  const result = await renameTeam((await projectDb(projectId)).db, ACTOR, { teamId, name: read(form, "name"), effectiveFrom: read(form, "effectiveFrom") });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/p/${projectId}/teams/${teamId}/manage`);
}

export async function retireTeamAction(previous: FormState, form: FormData): Promise<FormState> {
  const projectId = formProject(form);
  const teamId = read(form, "teamId");
  const result = await retireTeam((await projectDb(projectId)).db, ACTOR, {
    teamId, retiredOn: read(form, "retiredOn"), successorTeamIds: form.getAll("successors").map(String),
  });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/p/${projectId}/teams/${teamId}/manage`);
}

/** FR-01: move the team to another value stream. */
export async function changeValueStreamAction(previous: FormState, form: FormData): Promise<FormState> {
  const projectId = formProject(form);
  const teamId = read(form, "teamId");
  const result = await changeValueStream((await projectDb(projectId)).db, ACTOR, { teamId, valueStream: read(form, "valueStream") }, await sharedDb());
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/p/${projectId}/teams/${teamId}/manage`);
}

/** Where the team is based (sean, 15 Nov 2026). */
export async function changeBaseLocationAction(previous: FormState, form: FormData): Promise<FormState> {
  const projectId = formProject(form);
  const teamId = read(form, "teamId");
  const result = await changeBaseLocation((await projectDb(projectId)).db, ACTOR, { teamId, baseLocation: read(form, "baseLocation") }, await sharedDb());
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/p/${projectId}/teams/${teamId}/manage`);
}

/** The workbook's team attributes (sean, 15 Nov 2026). */
export async function updateTeamDetailsAction(previous: FormState, form: FormData): Promise<FormState> {
  const projectId = formProject(form);
  const teamId = read(form, "teamId");
  const optional = (name: string) => read(form, name) || null;
  const result = await updateTeamDetails((await projectDb(projectId)).db, ACTOR, {
    teamId, leadEmail: optional("leadEmail"),
    parentTeamName: optional("parentTeamName"), parentTeamLeadEmail: optional("parentTeamLeadEmail"),
    grandparentTeamName: optional("grandparentTeamName"), grandparentTeamLeadEmail: optional("grandparentTeamLeadEmail"),
    topLevelGroup: optional("topLevelGroup"), topLevelLeadEmail: optional("topLevelLeadEmail"),
    sourceHeadcount: readHeadcount(read(form, "sourceHeadcount")), idStatus: read(form, "idStatus"), dataQualityFlag: optional("dataQualityFlag"),
  });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/p/${projectId}/teams/${teamId}/manage`);
}
