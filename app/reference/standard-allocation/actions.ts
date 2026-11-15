"use server";

import { redirect } from "next/navigation";
import { saveSystemStandard } from "@/src/application/standardAllocation";
import { sharedDb } from "@/app/lib/project";
import { readStandardForm } from "@/app/lib/standardValues";
import { failed, type FormState } from "@/app/lib/formState";

const ACTOR = "Capacity Admin";

/** Save the system standard allocation, used by every project that hasn't set its own. */
export async function saveSystemStandardAction(previous: FormState, form: FormData): Promise<FormState> {
  const result = await saveSystemStandard(await sharedDb(), ACTOR, readStandardForm(form));
  if (!result.ok) return failed(previous, form, result.errors);
  redirect("/reference/standard-allocation?saved=1");
}
