"use client";

import type { Values } from "@/app/lib/ActionForm";
import { StandardAllocationForm } from "@/app/lib/StandardFields";
import { saveSystemStandardAction } from "./actions";

export function SystemStandardForm({ values }: { values: Values }) {
  return <StandardAllocationForm action={saveSystemStandardAction} values={values} />;
}
