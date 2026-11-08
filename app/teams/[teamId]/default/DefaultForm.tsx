"use client";

import { ActionForm, type Values } from "../../../lib/ActionForm";
import { saveDefaultAction } from "./actions";

/** UC03: a new version of the team default. Saving never overwrites history; it adds a version. */
export function DefaultForm({ teamId, values }: { teamId: string; values: Values }) {
  return (
    <ActionForm action={saveDefaultAction} hidden={{ teamId }} values={values} submitLabel="Save default" label="New default">
      {(v) => (
        <>
          <div className="grid">
            <label>Effective from<input name="effectiveFrom" type="date" defaultValue={v.effectiveFrom} /></label>
            <label>Overhead %<input name="overhead" type="number" step="any" min="0" max="100" defaultValue={v.overhead} /></label>
            <label>Contingency %<input name="contingency" type="number" step="any" min="0" max="100" defaultValue={v.contingency} /></label>
            <label>Status
              <select name="status" defaultValue={v.status}>
                <option>Active</option>
                <option>Draft</option>
              </select>
            </label>
          </div>
          <div className="grid">
            <label>Run %<input name="run" type="number" step="any" min="0" max="100" defaultValue={v.run} /></label>
            <label>Fix %<input name="fix" type="number" step="any" min="0" max="100" defaultValue={v.fix} /></label>
            <label>Sustain %<input name="sustain" type="number" step="any" min="0" max="100" defaultValue={v.sustain} /></label>
            <label>Change %<input name="change" type="number" step="any" min="0" max="100" defaultValue={v.change} /></label>
          </div>
          <label>Reason<input name="reason" type="text" defaultValue={v.reason} /></label>
        </>
      )}
    </ActionForm>
  );
}
