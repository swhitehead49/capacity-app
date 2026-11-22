"use server";

import { redirect } from "next/navigation";
import { updateProjectTeams, updateProjectValueStreams } from "@/src/application/projectValueStreams";
import { projectDb, sharedDb } from "@/app/lib/project";

// FR-18s (sean, 22 Nov 2026): the Admin sets up each project's value streams and teams. v1 has one actor.
const ACTOR = "Capacity Admin";
const setupPage = (projectId: string, params: Record<string, string>) =>
  `/reference/projects/${encodeURIComponent(projectId)}?${new URLSearchParams(params)}`;

export async function updateValueStreamsAction(form: FormData) {
  const projectId = String(form.get("projectId") ?? "");
  const { db } = await projectDb(projectId);
  const result = await updateProjectValueStreams(db, ACTOR, { names: form.getAll("valueStream").map(String) }, await sharedDb());
  if (!result.ok) redirect(setupPage(projectId, { error: result.errors.join("\n") }));
  redirect(setupPage(projectId, { streams: "1", added: result.added.join("\n"), removed: result.removed.join("\n") }));
}

export async function updateTeamsAction(form: FormData) {
  const projectId = String(form.get("projectId") ?? "");
  const { db } = await projectDb(projectId);
  const result = await updateProjectTeams(db, ACTOR, {
    teamIds: form.getAll("teamId").map(String), ticked: form.getAll("included").map(String),
  });
  if (!result.ok) redirect(setupPage(projectId, { error: result.errors.join("\n") }));
  redirect(setupPage(projectId, { teams: String(result.changed) }));
}
