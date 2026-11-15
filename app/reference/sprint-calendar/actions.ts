"use server";

import { redirect } from "next/navigation";
import { setUpSprintCalendar } from "@/src/application/sprintCalendar";
import { today } from "@/src/infrastructure/db/appDb";
import { sharedDb } from "@/app/lib/project";
import { failed, type FormState } from "@/app/lib/formState";

const ACTOR = "Capacity Admin";

export async function setUpSprintCalendarAction(previous: FormState, form: FormData): Promise<FormState> {
  const read = (name: string) => String(form.get(name) ?? "");
  const result = await setUpSprintCalendar(await sharedDb(), ACTOR, {
    firstSprintStart: read("firstSprintStart"), sprintLengthDays: read("sprintLengthDays"), sprintPrefix: read("sprintPrefix"),
  }, today());
  if (!result.ok) return failed(previous, form, result.errors);
  redirect("/reference/sprint-calendar");
}
