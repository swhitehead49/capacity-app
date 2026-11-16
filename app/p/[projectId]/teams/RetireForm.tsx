"use client";

import { ActionForm } from "@/app/lib/ActionForm";
import { retireTeamAction } from "./actions";

export interface Option { value: string; label: string }

/** UC17: retiring a team in this project (its members and plans are the project's own). */
export function RetireForm({ teamId, teams }: { teamId: string; teams: Option[] }) {
  return (
    <ActionForm action={retireTeamAction} hidden={{ teamId }} values={{}} submitLabel="Retire team" label="Retire">
      {(v) => (
        <div className="grid">
          <label>Last day<input name="retiredOn" type="date" defaultValue={v.retiredOn} /></label>
          <label>Replaced by (optional)
            <select name="successors" multiple size={Math.min(6, Math.max(3, teams.length))}>
              {teams.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <p className="muted hint">Pick the team(s) that take over its work. Ctrl/Cmd-click to pick several.</p>
        </div>
      )}
    </ActionForm>
  );
}
