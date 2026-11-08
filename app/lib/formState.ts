/** What a server action hands back to a form after a failed save. */
export interface FormState {
  errors: string[];
  submitted?: Record<string, string>; // what was typed, shown again after an error
  attempt: number; // changes on each failed try, so the fields re-render with `submitted`
}

export const emptyForm: FormState = { errors: [], attempt: 0 };

export function failed(previous: FormState, form: FormData, errors: string[]): FormState {
  const submitted = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)]));
  return { errors, submitted, attempt: previous.attempt + 1 };
}
