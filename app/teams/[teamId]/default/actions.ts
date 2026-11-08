"use server";

import { redirect } from "next/navigation";
import { saveTeamDefault } from "../../../../src/application/saveTeamDefault";
import { getDb } from "../../../../src/infrastructure/db/appDb";
import { failed, type FormState } from "../../../lib/formState";

// v1 has one actor (decision 8 Nov 2026).
const ACTOR = "Capacity Admin";

/** UC03: save a new version of the team default (percentages typed as 0–100). */
export async function saveDefaultAction(previous: FormState, form: FormData): Promise<FormState> {
  const teamId = String(form.get("teamId"));
  const read = (name: string) => String(form.get(name) ?? "").trim();
  const fraction = (name: string) => (read(name) === "" ? null : Number(read(name)) / 100);
  const result = await saveTeamDefault(await getDb(), ACTOR, {
    teamId,
    status: read("status") as "Draft" | "Active",
    effectiveFrom: read("effectiveFrom") || null,
    overhead: fraction("overhead"),
    split: { run: fraction("run") ?? 0, fix: fraction("fix") ?? 0, sustain: fraction("sustain") ?? 0, change: fraction("change") ?? 0 },
    reason: read("reason") || undefined,
  });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(`/teams/${teamId}/default`);
}
