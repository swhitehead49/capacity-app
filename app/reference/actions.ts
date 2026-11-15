"use server";

import { redirect } from "next/navigation";
import { addLocation, addStartingLocations, addValueStream, updateLocation } from "@/src/application/referenceData";
import { sharedDb } from "@/app/lib/project";
import { failed, type FormState } from "@/app/lib/formState";

// System reference data (sean, 15 Nov 2026). v1 has one actor (decision 8 Nov 2026).
const ACTOR = "Capacity Admin";
const read = (form: FormData, name: string) => String(form.get(name) ?? "");

export async function addValueStreamAction(previous: FormState, form: FormData): Promise<FormState> {
  const result = await addValueStream(await sharedDb(), ACTOR, { name: read(form, "name") });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect("/reference");
}

export async function addLocationAction(previous: FormState, form: FormData): Promise<FormState> {
  const result = await addLocation(await sharedDb(), ACTOR, {
    code: read(form, "code"), country: read(form, "country"), name: read(form, "name"), standardHours: read(form, "standardHours"),
  });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect("/reference/locations");
}

export async function addStartingLocationsAction() {
  await addStartingLocations(await sharedDb(), ACTOR);
  redirect("/reference/locations");
}

export async function updateLocationAction(previous: FormState, form: FormData): Promise<FormState> {
  const result = await updateLocation(await sharedDb(), ACTOR, {
    code: read(form, "code"), name: read(form, "name"), standardHours: read(form, "standardHours"),
  });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect("/reference/locations");
}
