"use client";

import { ActionForm } from "@/app/lib/ActionForm";
import { linkValueStreamAction } from "./makeupActions";

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
