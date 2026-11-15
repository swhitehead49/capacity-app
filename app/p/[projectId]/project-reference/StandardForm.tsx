"use client";

import type { Values } from "@/app/lib/ActionForm";
import { StandardAllocationForm } from "@/app/lib/StandardFields";
import { saveStandardAction } from "./actions";

/** The project's own standard allocation: what a new team starts with. */
export function StandardForm({ projectId, values }: { projectId: string; values: Values }) {
  return <StandardAllocationForm action={saveStandardAction} hidden={{ projectId }} values={values} />;
}
