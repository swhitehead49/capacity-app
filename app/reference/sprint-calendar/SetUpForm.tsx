"use client";

import { ActionForm } from "@/app/lib/ActionForm";
import { extendSprintCalendarAction, setUpSprintCalendarAction } from "./actions";

export function SetUpSprintCalendarForm() {
  return (
    <ActionForm action={setUpSprintCalendarAction} hidden={{}} values={{ sprintLengthDays: "14", sprintPrefix: "S" }}
      submitLabel="Set up sprint calendar" label="Set up sprint calendar">
      {(v) => (
        <div className="grid">
          <label>First sprint starts<input name="firstSprintStart" type="date" defaultValue={v.firstSprintStart} /></label>
          <label>Sprint length (days)<input name="sprintLengthDays" type="number" min="1" max="42" defaultValue={v.sprintLengthDays} /></label>
          <label>Sprint prefix<input name="sprintPrefix" defaultValue={v.sprintPrefix} maxLength={5} /></label>
        </div>
      )}
    </ActionForm>
  );
}

/** Extend the calendar to a later quarter (sean, 15 Nov 2026). `choices` are quarters such as "2029-Q4". */
export function ExtendSprintCalendarForm({ choices }: { choices: string[] }) {
  return (
    <ActionForm action={extendSprintCalendarAction} hidden={{}} values={{ quarter: choices[0] ?? "" }}
      submitLabel="Extend calendar" label="Extend calendar">
      {(v) => (
        <label>Extend calendar to
          <select name="quarter" defaultValue={v.quarter}>
            {choices.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </label>
      )}
    </ActionForm>
  );
}
