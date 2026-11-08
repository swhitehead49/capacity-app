"use server";

import { redirect } from "next/navigation";
import { addMember, endMember, moveMember, updateMember, type PersonDetails } from "../../../../src/application/teamMembers";
import { getDb } from "../../../../src/infrastructure/db/appDb";
import { failed, type FormState } from "../../../lib/formState";

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
const backToMembers = (teamId: string): never => redirect(`/teams/${teamId}/members`);

export async function addMemberAction(previous: FormState, form: FormData): Promise<FormState> {
  const teamId = String(form.get("teamId"));
  const result = await addMember(await getDb(), ACTOR, {
    teamId,
    email: String(form.get("email") ?? ""),
    teamAllocation: share(form, "teamAllocation"),
    sharedResource: form.get("sharedResource") === "on",
    startDate: text(form, "startDate") ?? "",
    person: personDetails(form),
  });
  return result.ok ? backToMembers(teamId) : failed(previous, form, result.errors);
}

export async function updateMemberAction(previous: FormState, form: FormData): Promise<FormState> {
  const result = await updateMember(await getDb(), ACTOR, {
    assignmentId: Number(form.get("assignmentId")),
    teamAllocation: share(form, "teamAllocation"),
    sharedResource: form.get("sharedResource") === "on",
    person: personDetails(form),
  });
  return result.ok ? backToMembers(String(form.get("teamId"))) : failed(previous, form, result.errors);
}

export async function endMemberAction(previous: FormState, form: FormData): Promise<FormState> {
  const result = await endMember(await getDb(), ACTOR, {
    assignmentId: Number(form.get("assignmentId")),
    endDate: text(form, "endDate") ?? "",
  });
  return result.ok ? backToMembers(String(form.get("teamId"))) : failed(previous, form, result.errors);
}

export async function moveMemberAction(previous: FormState, form: FormData): Promise<FormState> {
  const toTeamId = String(form.get("toTeamId") ?? "");
  const result = await moveMember(await getDb(), ACTOR, {
    assignmentId: Number(form.get("assignmentId")),
    toTeamId,
    date: text(form, "date") ?? "",
    teamAllocation: share(form, "teamAllocation"),
  });
  return result.ok ? backToMembers(toTeamId) : failed(previous, form, result.errors);
}
