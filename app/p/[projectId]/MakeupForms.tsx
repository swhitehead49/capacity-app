"use client";

import { ActionForm } from "@/app/lib/ActionForm";
import { addTeamsAction, linkValueStreamAction } from "./makeupActions";

export function LinkValueStreamForm({ choices }: { choices: string[] }) {
  return (
    <ActionForm action={linkValueStreamAction} hidden={{}} values={{}} submitLabel="Add value stream" label="Add value stream">
      {(v) => (
        <div className="grid">
          <label>Value stream
            <select name="valueStream" defaultValue={v.valueStream ?? ""}>
              <option value="">(choose)</option>
              {choices.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
      )}
    </ActionForm>
  );
}

export function AddTeamsForm({ valueStream, candidates }: { valueStream: string; candidates: { id: string; name: string; included: boolean }[] }) {
  return (
    <ActionForm action={addTeamsAction} hidden={{ valueStream }} values={{}} submitLabel={`Add to ${valueStream}`} label="Add teams">
      {() => (
        <fieldset className="checks">
          <legend>Teams without a value stream</legend>
          {candidates.map((t) => (
            <label key={t.id} className="check">
              <input type="checkbox" name="teamIds" value={t.id} /> {t.id} {t.name}{!t.included && <span className="muted"> (excluded)</span>}
            </label>
          ))}
        </fieldset>
      )}
    </ActionForm>
  );
}
