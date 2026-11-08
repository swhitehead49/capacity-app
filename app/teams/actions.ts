"use server";

import { redirect } from "next/navigation";
import { addTeam, changeValueStream, renameTeam, retireTeam } from "../../src/application/teams";
import { getDb } from "../../src/infrastructure/db/appDb";
import { failed, type FormState } from "../lib/formState";

// v1 has one actor (decision 8 Nov 2026).
const ACTOR = "Capacity Admin";
const read = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

/** UC15. Warnings (same name under another parent) are shown on the Teams list. */
export async function addTeamAction(previous: FormState, form: FormData): Promise<FormState> {
  const result = await addTeam(await getDb(), ACTOR, {
    id: read(form, "id"), name: read(form, "name"), valueStream: read(form, "valueStream") || null,
    leadEmail: read(form, "leadEmail") || null, effectiveFrom: read(form, "effectiveFrom"),
  });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/teams${result.warnings.length ? `?${new URLSearchParams({ warning: result.warnings.join("\n") })}` : ""}`);
}

export async function renameTeamAction(previous: FormState, form: FormData): Promise<FormState> {
  const teamId = read(form, "teamId");
  const result = await renameTeam(await getDb(), ACTOR, { teamId, name: read(form, "name"), effectiveFrom: read(form, "effectiveFrom") });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/teams/${teamId}/manage`);
}

export async function retireTeamAction(previous: FormState, form: FormData): Promise<FormState> {
  const teamId = read(form, "teamId");
  const result = await retireTeam(await getDb(), ACTOR, {
    teamId, retiredOn: read(form, "retiredOn"), successorTeamIds: form.getAll("successors").map(String),
  });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/teams/${teamId}/manage`);
}

/** FR-01: move the team to another value stream. */
export async function changeValueStreamAction(previous: FormState, form: FormData): Promise<FormState> {
  const teamId = read(form, "teamId");
  const result = await changeValueStream(await getDb(), ACTOR, { teamId, valueStream: read(form, "valueStream") });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/teams/${teamId}/manage`);
}
