"use client";

import { ActionForm } from "@/app/lib/ActionForm";
import { addLocationAction, addValueStreamAction, updateLocationAction } from "./actions";

export function AddValueStreamForm() {
  return (
    <ActionForm action={addValueStreamAction} hidden={{}} values={{}} submitLabel="Add value stream" label="Add value stream">
      {(v) => <div className="grid"><label>Name<input name="name" defaultValue={v.name} /></label></div>}
    </ActionForm>
  );
}

export function AddLocationForm() {
  return (
    <ActionForm action={addLocationAction} hidden={{}} values={{}} submitLabel="Add location" label="Add location">
      {(v) => (
        <div className="grid">
          <label>Code<input name="code" defaultValue={v.code} placeholder="e.g. DE-BY" /></label>
          <label>Country<input name="country" defaultValue={v.country} placeholder="e.g. DE" /></label>
          <label>Name<input name="name" defaultValue={v.name} placeholder="e.g. Bavaria" /></label>
          <label>Standard hours<input name="standardHours" type="number" step="any" defaultValue={v.standardHours} /></label>
        </div>
      )}
    </ActionForm>
  );
}

export function EditLocationForm({ code, values }: { code: string; values: Record<string, string> }) {
  return (
    <ActionForm action={updateLocationAction} hidden={{ code }} values={values} submitLabel="Save location" label="Edit location">
      {(v) => (
        <div className="grid">
          <label>Name<input name="name" defaultValue={v.name} /></label>
          <label>Standard hours<input name="standardHours" type="number" step="any" min="0" defaultValue={v.standardHours} /></label>
          <p className="muted hint">Full-time hours per week there. Blank means not known yet.</p>
        </div>
      )}
    </ActionForm>
  );
}
