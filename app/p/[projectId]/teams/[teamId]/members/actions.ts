"use server";

import { redirect } from "next/navigation";
import { addMember, endMember, moveMember, updateMember, type PersonDetails } from "@/src/application/teamMembers";
import { formProject, projectDb } from "@/app/lib/project";
import { failed, type FormState } from "@/app/lib/formState";

// v1 has one actor (decision 8 Nov 2026).
const ACTOR = "Capacity Admin";

const text = (form: FormData, name: string) => {
  const value = String(form.get(name) ?? "").trim();
  return value === "" ? null : value;
};
const number = (form: FormData, name: string) => {
  const value = text(form, name);
  return value === null ? null : Number(value);
};
/** Team % is typed as 0–100 and stored as 0–1. */
const share = (form: FormData, name: string) => {
  const value = number(form, name);
  return value === null ? null : value / 100;
};
const personDetails = (form: FormData): PersonDetails => ({
  role: text(form, "role"),
  locationCode: text(form, "locationCode"),
  contractedHours: number(form, "contractedHours"),
  employmentStart: text(form, "employmentStart"),
  employmentEnd: text(form, "employmentEnd"),
});
const backToMembers = (projectId: string, teamId: string): never => redirect(`/p/${projectId}/teams/${teamId}/members`);

export async function addMemberAction(previous: FormState, form: FormData): Promise<FormState> {
  const projectId = formProject(form);
  const teamId = String(form.get("teamId"));
  const result = await addMember((await projectDb(projectId)).db, ACTOR, {
    teamId,
    email: String(form.get("email") ?? ""),
    teamAllocation: share(form, "teamAllocation"),
    sharedResource: form.get("sharedResource") === "on",
    startDate: text(form, "startDate") ?? "",
    person: personDetails(form),
  });
  return result.ok ? backToMembers(projectId, teamId) : failed(previous, form, result.errors);
}

export async function updateMemberAction(previous: FormState, form: FormData): Promise<FormState> {
  const projectId = formProject(form);
  const result = await updateMember((await projectDb(projectId)).db, ACTOR, {
    assignmentId: Number(form.get("assignmentId")),
    teamAllocation: share(form, "teamAllocation"),
    sharedResource: form.get("sharedResource") === "on",
    person: personDetails(form),
  });
  return result.ok ? backToMembers(projectId, String(form.get("teamId"))) : failed(previous, form, result.errors);
}

export async function endMemberAction(previous: FormState, form: FormData): Promise<FormState> {
  const projectId = formProject(form);
  const result = await endMember((await projectDb(projectId)).db, ACTOR, {
    assignmentId: Number(form.get("assignmentId")),
    endDate: text(form, "endDate") ?? "",
  });
  return result.ok ? backToMembers(projectId, String(form.get("teamId"))) : failed(previous, form, result.errors);
}

export async function moveMemberAction(previous: FormState, form: FormData): Promise<FormState> {
  const projectId = formProject(form);
  const toTeamId = String(form.get("toTeamId") ?? "");
  const result = await moveMember((await projectDb(projectId)).db, ACTOR, {
    assignmentId: Number(form.get("assignmentId")),
    toTeamId,
    date: text(form, "date") ?? "",
    teamAllocation: share(form, "teamAllocation"),
  });
  return result.ok ? backToMembers(projectId, toTeamId) : failed(previous, form, result.errors);
}
