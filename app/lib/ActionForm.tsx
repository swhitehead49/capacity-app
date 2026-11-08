"use client";

import { useActionState, type ReactNode } from "react";
import { emptyForm, type FormState } from "./formState";

type Action = (previous: FormState, form: FormData) => Promise<FormState>;
export type Values = Record<string, string>;

/** A form whose errors show at the top and whose typed values survive a failed save. */
export function ActionForm({ action, hidden, values, submitLabel, label, children }: {
  action: Action; hidden: Values; values: Values; submitLabel: string; label: string;
  children: (v: Values) => ReactNode;
}) {
  const [state, formAction, saving] = useActionState(action, emptyForm);
  const v = { ...values, ...state.submitted };
  return (
    <form action={formAction} className="edit-form" aria-label={label}>
      {state.errors.length > 0 && (
        <div role="alert" aria-label="Problems saving" className="errors">
          {state.errors.map((error) => <p key={error}>{error}</p>)}
        </div>
      )}
      {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <fieldset key={state.attempt} className="fields">{children(v)}</fieldset>
      <div className="actions"><button type="submit" disabled={saving}>{saving ? "Saving…" : submitLabel}</button></div>
    </form>
  );
}

