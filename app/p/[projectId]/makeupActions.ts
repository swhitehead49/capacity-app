"use server";

import { redirect } from "next/navigation";
import { linkValueStream, setTeamIncluded, unlinkValueStream } from "@/src/application/projectValueStreams";
import { formProject, projectDb, sharedDb } from "@/app/lib/project";
import { failed, type FormState } from "@/app/lib/formState";

// The project's makeup (sean, 15 Nov 2026): its value streams and which teams are in them.
const ACTOR = "Capacity Admin";
const read = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const db = async (form: FormData) => (await projectDb(formProject(form))).db;

export async function linkValueStreamAction(previous: FormState, form: FormData): Promise<FormState> {
  const result = await linkValueStream(await db(form), ACTOR, { name: read(form, "valueStream") }, await sharedDb());
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/p/${formProject(form)}`);
}

export async function unlinkValueStreamAction(form: FormData) {
  await unlinkValueStream(await db(form), ACTOR, { name: read(form, "valueStream") });
  redirect(`/p/${formProject(form)}`);
}

export async function setIncludedAction(form: FormData) {
  await setTeamIncluded(await db(form), ACTOR, { teamId: read(form, "teamId"), included: read(form, "included") === "true" });
  redirect(`/p/${formProject(form)}`);
}
