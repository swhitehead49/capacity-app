"use client";

import { ActionForm } from "@/app/lib/ActionForm";
import { setUpSprintCalendarAction } from "./actions";

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
