"use client";

import { ActionForm, type Values } from "@/app/lib/ActionForm";
import { saveStandardAction } from "./standardActions";

const field = (label: string, name: string, v: Values) => (
  <label>{label}<input name={name} type="number" step="any" min="0" max="100" defaultValue={v[name]} /></label>
);

/** The project's standard allocation: what a new team starts with. */
export function StandardForm({ projectId, values }: { projectId: string; values: Values }) {
  return (
    <ActionForm action={saveStandardAction} hidden={{ projectId }} values={values} submitLabel="Save standard allocation" label="Standard allocation">
      {(v) => (
        <>
          <div className="grid">
            {field("Overhead %", "overhead", v)}
            {field("Contingency %", "contingency", v)}
          </div>
          <p className="muted">All seven add up to 100% of available days.</p>
          <div className="grid">
            {field("Run %", "run", v)}
            {field("Fix %", "fix", v)}
            {field("Sustain %", "sustain", v)}
            {field("Change %", "change", v)}
            {field("Enabling/Training %", "enabling", v)}
          </div>
        </>
      )}
    </ActionForm>
  );
}
