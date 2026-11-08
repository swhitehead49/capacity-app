"use server";

import { redirect } from "next/navigation";
import { saveOverride } from "../../../../../../src/application/saveOverride";
import { revertAllOverrides, revertOverride } from "../../../../../../src/application/revertOverrides";
import { getDb, today } from "../../../../../../src/infrastructure/db/appDb";

export interface FormState {
  errors: string[];
  submitted?: Record<string, string>; // what was typed, shown again after an error
  attempt: number;
}

// v1 has one actor (decision 8 Nov 2026). Replace with the signed-in user when roles arrive.
const ACTOR = "Capacity Admin";

/** Reads the Edit form (percentages typed as 0–100), saves the override, and returns to the planner. */
export async function saveOverrideAction(previous: FormState, form: FormData): Promise<FormState> {
  const teamId = String(form.get("teamId"));
  const percent = (name: string) => Number(form.get(name)) / 100;
  const overheadText = String(form.get("overhead") ?? "").trim();
  const contingencyText = String(form.get("contingency") ?? "").trim();

  const result = await saveOverride(await getDb(), ACTOR, {
    teamId,
    periodId: String(form.get("periodId")),
    status: form.get("status") as "Draft" | "Active" | "Retired",
    overhead: overheadText === "" ? null : Number(overheadText) / 100,
    contingency: contingencyText === "" ? null : Number(contingencyText) / 100,
    split: { run: percent("run"), fix: percent("fix"), sustain: percent("sustain"), change: percent("change") },
    reason: String(form.get("reason") ?? ""),
  });
  if (!result.ok) {
    const submitted = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
    return { errors: result.errors, submitted, attempt: previous.attempt + 1 };
  }
  redirect(`/teams/${teamId}`);
}

/** Revert this one period to the team default (requested 8 Nov 2026). */
export async function revertPeriodAction(form: FormData) {
  const teamId = String(form.get("teamId"));
  await revertOverride(await getDb(), ACTOR, { teamId, periodId: String(form.get("periodId")) });
  redirect(`/teams/${teamId}`);
}

/** Revert every current and future period for the team. */
export async function revertAllAction(form: FormData) {
  const teamId = String(form.get("teamId"));
  await revertAllOverrides(await getDb(), ACTOR, { teamId, today: today() });
  redirect(`/teams/${teamId}`);
}
