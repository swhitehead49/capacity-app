"use client";

import { useActionState } from "react";
import { saveOverrideAction, type FormState } from "./actions";

export interface OverrideFormValues {
  teamId: string;
  periodId: string;
  status: "Draft" | "Active" | "Retired";
  overhead: string; // empty = inherit
  contingency: string; // empty = inherit
  run: string;
  fix: string;
  sustain: string;
  change: string;
  reason: string;
}

/** The Edit form. Errors from the rules are shown at the top without losing what was typed. */
export function OverrideForm({ values }: { values: OverrideFormValues }) {
  const [state, action, saving] = useActionState<FormState, FormData>(saveOverrideAction, { errors: [], attempt: 0 });
  // After a failed save, show what was typed rather than the original values.
  const v = { ...values, ...state.submitted } as OverrideFormValues;
  return (
    <form action={action} className="edit-form">
      {state.errors.length > 0 && (
        <div role="alert" aria-label="Problems saving" className="errors">
          {state.errors.map((error) => <p key={error}>{error}</p>)}
        </div>
      )}
      <input type="hidden" name="teamId" value={values.teamId} />
      <input type="hidden" name="periodId" value={values.periodId} />
      <fieldset key={state.attempt} className="fields">
      <div className="grid">
        <label>Run %<input name="run" type="number" step="any" min="0" max="100" defaultValue={v.run} /></label>
        <label>Fix %<input name="fix" type="number" step="any" min="0" max="100" defaultValue={v.fix} /></label>
        <label>Sustain %<input name="sustain" type="number" step="any" min="0" max="100" defaultValue={v.sustain} /></label>
        <label>Change %<input name="change" type="number" step="any" min="0" max="100" defaultValue={v.change} /></label>
        <label>Overhead % (blank = inherit)<input name="overhead" type="number" step="any" min="0" max="100" defaultValue={v.overhead} /></label>
        <label>Contingency % (blank = inherit)<input name="contingency" type="number" step="any" min="0" max="100" defaultValue={v.contingency} /></label>
        <label>Status
          <select name="status" defaultValue={v.status}>
            <option>Draft</option>
            <option>Active</option>
            <option>Retired</option>
          </select>
        </label>
      </div>
      <label>Reason<input name="reason" type="text" defaultValue={v.reason} /></label>
      </fieldset>
      <div className="actions">
        <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <a href={`/teams/${values.teamId}`}>Cancel</a>
      </div>
    </form>
  );
}
