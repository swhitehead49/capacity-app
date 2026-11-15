"use client";

import { ActionForm } from "@/app/lib/ActionForm";
import { addLocationAction, addValueStreamAction } from "./actions";

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
