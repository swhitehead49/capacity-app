"use server";

import { redirect } from "next/navigation";
import { readHeadcount } from "@/src/domain/organisation/teamDetails";
import { addTeam, changeBaseLocation, changeValueStream, renameTeam, updateTeamDetails } from "@/src/application/teams";
import { importTeams } from "@/src/application/importTeams";
import { today } from "@/src/infrastructure/db/appDb";
import { sharedDb } from "@/app/lib/project";
import { failed, type FormState } from "@/app/lib/formState";

// The master team list (sean, 15 Nov 2026): the Admin keeps every team once, in the shared database.
// Projects get the changes the next time one of their pages opens.
const ACTOR = "Capacity Admin";
const MAX_SHOWN = 20;
const read = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const teamPage = (teamId: string) => `/reference/teams/${encodeURIComponent(teamId)}`;

/** UC15. Warnings (same name in another value stream) are shown on the Teams tab. */
export async function addTeamAction(previous: FormState, form: FormData): Promise<FormState> {
  const shared = await sharedDb();
  const result = await addTeam(shared, ACTOR, {
    id: read(form, "id"), name: read(form, "name"), valueStream: read(form, "valueStream") || null,
    leadEmail: read(form, "leadEmail") || null, baseLocation: read(form, "baseLocation") || null, effectiveFrom: read(form, "effectiveFrom"),
  }, shared);
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/reference/teams${result.warnings.length ? `?${new URLSearchParams({ warning: result.warnings.join("\n") })}` : ""}`);
}

/** Import teams from a CSV file (sean, 15 Nov 2026). All or nothing. */
export async function importTeamsAction(form: FormData) {
  const file = form.get("file");
  const csv = file instanceof File ? await file.text() : "";
  const shared = await sharedDb();
  const result = await importTeams(shared, ACTOR, { csv, today: today() }, shared);
  if (result.ok) {
    const params = new URLSearchParams({ imported: String(result.count) });
    if (result.warnings.length) params.set("warning", result.warnings.join("\n"));
    redirect(`/reference/teams?${params}`);
  }
  const shown = result.errors.slice(0, MAX_SHOWN);
  if (result.errors.length > MAX_SHOWN) shown.push(`...and ${result.errors.length - MAX_SHOWN} more`);
  redirect(`/reference/teams/import?${new URLSearchParams({ error: shown.join("\n") })}`);
}

export async function renameTeamAction(previous: FormState, form: FormData): Promise<FormState> {
  const teamId = read(form, "teamId");
  const result = await renameTeam(await sharedDb(), ACTOR, { teamId, name: read(form, "name"), effectiveFrom: read(form, "effectiveFrom") });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(teamPage(teamId));
}

/** FR-01: move the team to another value stream. */
export async function changeValueStreamAction(previous: FormState, form: FormData): Promise<FormState> {
  const teamId = read(form, "teamId");
  const shared = await sharedDb();
  const result = await changeValueStream(shared, ACTOR, { teamId, valueStream: read(form, "valueStream") }, shared);
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(teamPage(teamId));
}

/** Where the team is based (sean, 15 Nov 2026). */
export async function changeBaseLocationAction(previous: FormState, form: FormData): Promise<FormState> {
  const teamId = read(form, "teamId");
  const shared = await sharedDb();
  const result = await changeBaseLocation(shared, ACTOR, { teamId, baseLocation: read(form, "baseLocation") }, shared);
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(teamPage(teamId));
}

/** The workbook's team attributes (sean, 15 Nov 2026). */
export async function updateTeamDetailsAction(previous: FormState, form: FormData): Promise<FormState> {
  const teamId = read(form, "teamId");
  const optional = (name: string) => read(form, name) || null;
  const result = await updateTeamDetails(await sharedDb(), ACTOR, {
    teamId, leadEmail: optional("leadEmail"),
    parentTeamName: optional("parentTeamName"), parentTeamLeadEmail: optional("parentTeamLeadEmail"),
    grandparentTeamName: optional("grandparentTeamName"), grandparentTeamLeadEmail: optional("grandparentTeamLeadEmail"),
    topLevelGroup: optional("topLevelGroup"), topLevelLeadEmail: optional("topLevelLeadEmail"),
    sourceHeadcount: readHeadcount(read(form, "sourceHeadcount")), idStatus: read(form, "idStatus"), dataQualityFlag: optional("dataQualityFlag"),
  });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(teamPage(teamId));
}
