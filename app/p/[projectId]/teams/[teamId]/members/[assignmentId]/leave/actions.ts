"use server";

import { redirect } from "next/navigation";
import { addLeave, cancelLeave } from "@/src/application/leave";
import { getMember } from "@/src/application/teamMembers";
import { formProject, projectDb } from "@/app/lib/project";
import { failed, type FormState } from "@/app/lib/formState";

// v1 has one actor (decision 8 Nov 2026).
const ACTOR = "Capacity Admin";

const leavePage = (projectId: string, teamId: string, assignmentId: string) =>
  `/p/${projectId}/teams/${teamId}/members/${assignmentId}/leave`;

/** UC09: book leave for the person on this membership. */
export async function bookLeaveAction(previous: FormState, form: FormData): Promise<FormState> {
  const projectId = formProject(form);
  const teamId = String(form.get("teamId"));
  const assignmentId = String(form.get("assignmentId"));
  const db = (await projectDb(projectId)).db;
  const member = await getMember(db, Number(assignmentId));
  if (!member) return failed(previous, form, ["This membership no longer exists"]);
  const result = await addLeave(db, ACTOR, {
    email: member.email,
    startDate: String(form.get("startDate") ?? ""),
    endDate: String(form.get("endDate") ?? ""),
    type: String(form.get("type") ?? ""),
    dayFraction: form.get("dayFraction") === "half" ? 0.5 : 1,
  });
  if (!result.ok) return failed(previous, form, result.errors);
  redirect(leavePage(projectId, teamId, assignmentId));
}

/** Cancelling keeps the record; the planner ignores cancelled leave. */
export async function cancelLeaveAction(form: FormData): Promise<void> {
  const projectId = formProject(form);
  await cancelLeave((await projectDb(projectId)).db, ACTOR, { id: Number(form.get("leaveId")) });
  redirect(leavePage(projectId, String(form.get("teamId")), String(form.get("assignmentId"))));
}
