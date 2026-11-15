"use server";

import { redirect } from "next/navigation";
import { addPublicHoliday, putBackPublicHoliday, removePublicHoliday } from "@/src/application/holidayChanges";
import { formProject, projectDb, sharedDb } from "@/app/lib/project";
import { failed, type FormState } from "@/app/lib/formState";

// Add or remove single public holidays (sean, 15 Nov 2026). Calendars are shared, so changes go to the shared database.
const ACTOR = "Capacity Admin";
const read = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

async function shared(form: FormData) {
  await projectDb(formProject(form)); // only checks the project exists
  return sharedDb();
}
const back = (form: FormData) => `/p/${formProject(form)}/holidays/${read(form, "country")}/${read(form, "year")}`;

export async function addHolidayAction(previous: FormState, form: FormData): Promise<FormState> {
  const result = await addPublicHoliday(await shared(form), ACTOR, {
    country: read(form, "country"), date: read(form, "date"), name: read(form, "name"),
    regions: form.getAll("regions").map(String), reason: read(form, "reason"),
  });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(back(form));
}

export async function removeHolidayAction(form: FormData) {
  await removePublicHoliday(await shared(form), ACTOR, { id: Number(read(form, "id")), reason: "" });
  redirect(back(form));
}

export async function putBackHolidayAction(form: FormData) {
  await putBackPublicHoliday(await shared(form), ACTOR, { id: Number(read(form, "id")) });
  redirect(back(form));
}
