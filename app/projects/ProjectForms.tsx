"use client";

import { ActionForm } from "@/app/lib/ActionForm";
import { createProjectAction, renameProjectAction } from "./actions";

export function NewProjectForm() {
  return (
    <ActionForm action={createProjectAction} hidden={{}} values={{}} submitLabel="Create project" label="New project">
      {(v) => <label>Project name<input name="name" defaultValue={v.name} placeholder="e.g. Cardiology" /></label>}
    </ActionForm>
  );
}

/** The ID in web addresses stays the same, so links keep working. */
export function RenameProjectForm({ projectId, name }: { projectId: string; name: string }) {
  return (
    <ActionForm action={renameProjectAction} hidden={{ projectId }} values={{ name }} submitLabel="Rename" label="Rename project">
      {(v) => <label>Project name<input name="name" defaultValue={v.name} /></label>}
    </ActionForm>
  );
}
