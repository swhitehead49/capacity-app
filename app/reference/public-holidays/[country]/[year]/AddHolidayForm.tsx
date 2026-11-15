"use client";

import { ActionForm } from "@/app/lib/ActionForm";
import { addHolidayAction } from "./actions";

/** Add one public holiday by hand (sean, 15 Nov 2026). No regions ticked = the whole country. */
export function AddHolidayForm({ country, year, regions }: { country: string; year: string; regions: { code: string; name: string }[] }) {
  return (
    <ActionForm action={addHolidayAction} hidden={{ country, year }} values={{}} submitLabel="Add holiday" label="Add a holiday">
      {(v) => (
        <>
          <div className="grid">
            <label>Date<input name="date" type="date" min={`${year}-01-01`} max={`${year}-12-31`} defaultValue={v.date} /></label>
            <label>Name<input name="name" defaultValue={v.name} placeholder="e.g. Company day" /></label>
            <label>Reason (optional)<input name="reason" defaultValue={v.reason} /></label>
          </div>
          <fieldset className="checks">
            <legend>Applies in (tick none for the whole country)</legend>
            {regions.map((r) => (
              <label key={r.code} className="check">
                <input type="checkbox" name="regions" value={r.code} /> {r.code}{r.name !== r.code && <span className="muted"> {r.name}</span>}
              </label>
            ))}
          </fieldset>
        </>
      )}
    </ActionForm>
  );
}
