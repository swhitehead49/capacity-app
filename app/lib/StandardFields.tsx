"use client";

import { ActionForm, type Values } from "@/app/lib/ActionForm";
import type { FormState } from "@/app/lib/formState";

const field = (label: string, name: string, v: Values) => (
  <label>{label}<input name={name} type="number" step="any" min="0" max="100" defaultValue={v[name]} /></label>
);

/** The six standard allocation percentages, used by the system and project standard forms. */
export function StandardAllocationForm({ action, hidden = {}, values }: {
  action: (previous: FormState, form: FormData) => Promise<FormState>; hidden?: Values; values: Values;
}) {
  return (
    <ActionForm action={action} hidden={hidden} values={values} submitLabel="Save standard allocation" label="Standard allocation">
      {(v) => (
        <>
          <div className="grid">
            {field("Organisational %", "overhead", v)}
            {field("Unplanned %", "contingency", v)}
          </div>
          <p className="muted">All six add up to 100% of available days.</p>
          <div className="grid">
            {field("Maintenance %", "run", v)}
            {field("Technical improvements %", "sustain", v)}
            {field("Change %", "change", v)}
            {field("Enabling/Training %", "enabling", v)}
          </div>
        </>
      )}
    </ActionForm>
  );
}
