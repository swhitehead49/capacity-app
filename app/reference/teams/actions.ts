"use server";

import { redirect } from "next/navigation";
import { readHeadcount, readTeamType } from "@/src/domain/organisation/teamDetails";
import { addTeam, changeBaseLocation, changeValueStream, renameTeam, updateTeamDetails } from "@/src/application/teams";
import { importTeams } from "@/src/application/importTeams";
import { deleteMasterTeam, deleteProvisionalTeams, purgeTeam, retireMasterTeam, saveMasterTeamRows } from "@/src/application/masterTeams";
import { allProjectDbs } from "./projectDbs";
import { today } from "@/src/infrastructure/db/appDb";
import { sharedDb } from "@/app/lib/project";
import { failed, type FormState } from "@/app/lib/formState";

// The master team list (sean, 15 Nov 2026): the Admin keeps every team once, in the shared database.
// Projects get the changes the next time one of their pages opens.
const ACTOR = "Capacity Admin";
const MAX_SHOWN = 20;
const read = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const teamPage = (teamId: string) => `/reference/teams/${encodeURIComponent(teamId)}?saved=1`;

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
    teamType: readTeamType(read(form, "teamType")),
    teamLeadFirstName: optional("teamLeadFirstName"), teamLeadLastName: optional("teamLeadLastName"),
    parentTeamLeadFirstName: optional("parentTeamLeadFirstName"), parentTeamLeadLastName: optional("parentTeamLeadLastName"),
    grandparentTeamLeadFirstName: optional("grandparentTeamLeadFirstName"), grandparentTeamLeadLastName: optional("grandparentTeamLeadLastName"),
    topLevelLeadFirstName: optional("topLevelLeadFirstName"), topLevelLeadLastName: optional("topLevelLeadLastName"),
  });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(teamPage(teamId));
}

/** The master list's table, saved together (sean, 16 Nov 2026). Rows without problems are saved even if others have some. */
export async function saveMasterTeamsAction(previous: FormState, form: FormData): Promise<FormState> {
  const rows = form.getAll("teamId").map(String).map((teamId) => ({
    teamId,
    name: read(form, `name:${teamId}`), valueStream: read(form, `valueStream:${teamId}`), baseLocation: read(form, `baseLocation:${teamId}`),
    parentTeamName: read(form, `parentTeamName:${teamId}`), grandparentTeamName: read(form, `grandparentTeamName:${teamId}`),
    idStatus: read(form, `idStatus:${teamId}`), teamType: read(form, `teamType:${teamId}`),
  }));
  const result = await saveMasterTeamRows(await sharedDb(), ACTOR, today(), rows);
  if (!result.ok) {
    const saved = result.changed ? [`Changes to ${result.changed} other team${result.changed === 1 ? " were" : "s were"} saved.`] : [];
    return failed(previous, form, [...result.errors, ...saved]);
  }
  redirect(`/reference/teams?saved=${result.changed}`);
}

/** Delete a Provisional team that nothing uses yet, everywhere (sean, 16 Nov 2026). */
export async function deleteTeamAction(previous: FormState, form: FormData): Promise<FormState> {
  const teamId = read(form, "teamId");
  const shared = await sharedDb();
  const result = await deleteMasterTeam(shared, (await allProjectDbs()).map((p) => p.db), ACTOR, { teamId });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/reference/teams?deleted=${encodeURIComponent(teamId)}`);
}

/** FR-18q (sean, 22 Nov 2026): delete every unused Provisional team at once, after confirming. */
export async function deleteProvisionalTeamsAction(previous: FormState, form: FormData): Promise<FormState> {
  if (read(form, "confirm").toUpperCase() !== "DELETE") return failed(previous, form, ["Type DELETE to confirm"]);
  const { deleted, kept } = await deleteProvisionalTeams(await sharedDb(), (await allProjectDbs()).map((p) => p.db), ACTOR);
  const params = new URLSearchParams({ bulkDeleted: String(deleted.length) });
  if (kept.length) params.set("kept", kept.slice(0, MAX_SHOWN).join("\n"));
  redirect(`/reference/teams?${params}`);
}

/** UC17: retire a team in every project at once (sean, 16 Nov 2026). */
export async function retireTeamAction(previous: FormState, form: FormData): Promise<FormState> {
  const teamId = read(form, "teamId");
  const shared = await sharedDb();
  const result = await retireMasterTeam(shared, await allProjectDbs(), ACTOR, today(), {
    teamId, retiredOn: read(form, "retiredOn"), successorTeamIds: form.getAll("successors").map(String),
  });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(teamPage(teamId));
}

/** Delete a team and all its data, everywhere, once its ID is typed (sean, 16 Nov 2026). */
export async function purgeTeamAction(previous: FormState, form: FormData): Promise<FormState> {
  const teamId = read(form, "teamId");
  const result = await purgeTeam(await sharedDb(), await allProjectDbs(), ACTOR, { teamId, confirm: read(form, "confirm") });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/reference/teams?deleted=${encodeURIComponent(teamId)}`);
}
