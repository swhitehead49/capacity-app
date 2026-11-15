"use client";

import { ActionForm } from "@/app/lib/ActionForm";
import { LEAVE_TYPES } from "@/src/domain/people/leaveRules";
import { bookLeaveAction } from "./actions";

/** UC09: book a person's own leave. Weekends and public holidays inside the dates are not counted twice. */
export function LeaveForm({ teamId, assignmentId }: { teamId: string; assignmentId: string }) {
  return (
    <ActionForm action={bookLeaveAction} hidden={{ teamId, assignmentId }} values={{ type: "Annual leave", dayFraction: "full" }} submitLabel="Book leave" label="Book leave">
      {(v) => (
        <div className="grid">
          <label>From<input name="startDate" type="date" defaultValue={v.startDate} /></label>
          <label>To<input name="endDate" type="date" defaultValue={v.endDate} /></label>
          <label>Type
            <select name="type" defaultValue={v.type}>
              {LEAVE_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>Days
            <select name="dayFraction" defaultValue={v.dayFraction}>
              <option value="full">Full days</option>
              <option value="half">Half days</option>
            </select>
          </label>
        </div>
      )}
    </ActionForm>
  );
}
