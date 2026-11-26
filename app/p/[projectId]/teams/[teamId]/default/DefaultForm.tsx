"use client";

import { ActionForm, type Values } from "@/app/lib/ActionForm";
import { saveDefaultAction } from "./actions";

/** UC03: a new version of the team default. Saving never overwrites history; it adds a version. */
export function DefaultForm({ teamId, values }: { teamId: string; values: Values }) {
  return (
    <ActionForm action={saveDefaultAction} hidden={{ teamId }} values={values} submitLabel="Save default" label="New default">
      {(v) => (
        <>
          <div className="grid">
            <label>Effective from<input name="effectiveFrom" type="date" defaultValue={v.effectiveFrom} /></label>
            <label>Organisational %<input name="overhead" type="number" step="any" min="0" max="100" defaultValue={v.overhead} /></label>
            <label>Unplanned %<input name="contingency" type="number" step="any" min="0" max="100" defaultValue={v.contingency} /></label>
            <label>Status
              <select name="status" defaultValue={v.status}>
                <option>Active</option>
                <option>Draft</option>
              </select>
            </label>
          </div>
          <p className="muted">Organisational, Unplanned and the four types of work add up to 100% of available days.</p>
          <div className="grid">
            <label>Maintenance %<input name="run" type="number" step="any" min="0" max="100" defaultValue={v.run} /></label>
                        <label>Technical improvements %<input name="sustain" type="number" step="any" min="0" max="100" defaultValue={v.sustain} /></label>
            <label>Change %<input name="change" type="number" step="any" min="0" max="100" defaultValue={v.change} /></label>
            <label>Enabling/Training %<input name="enabling" type="number" step="any" min="0" max="100" defaultValue={v.enabling} /></label>
          </div>
          <label>Reason<input name="reason" type="text" defaultValue={v.reason} /></label>
        </>
      )}
    </ActionForm>
  );
}
