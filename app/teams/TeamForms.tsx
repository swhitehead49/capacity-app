"use client";

import { ActionForm } from "../lib/ActionForm";
import { addTeamAction, renameTeamAction, retireTeamAction } from "./actions";

export interface Option { value: string; label: string }

export function AddTeamForm({ today }: { today: string }) {
  return (
    <ActionForm action={addTeamAction} hidden={{}} values={{ effectiveFrom: today }} submitLabel="Add team" label="Add team">
      {(v) => (
        <div className="grid">
          <label>Team ID<input name="id" defaultValue={v.id} placeholder="e.g. T074" /></label>
          <label>Name<input name="name" defaultValue={v.name} /></label>
          <label>Value stream<input name="valueStream" defaultValue={v.valueStream} /></label>
          <label>Lead email<input name="leadEmail" defaultValue={v.leadEmail} /></label>
          <label>Start date<input name="effectiveFrom" type="date" defaultValue={v.effectiveFrom} /></label>
        </div>
      )}
    </ActionForm>
  );
}

export function RenameForm({ teamId, today }: { teamId: string; today: string }) {
  return (
    <ActionForm action={renameTeamAction} hidden={{ teamId }} values={{ effectiveFrom: today }} submitLabel="Rename" label="Rename">
      {(v) => (
        <div className="grid">
          <label>New name<input name="name" defaultValue={v.name} /></label>
          <label>From<input name="effectiveFrom" type="date" defaultValue={v.effectiveFrom} /></label>
        </div>
      )}
    </ActionForm>
  );
}

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
