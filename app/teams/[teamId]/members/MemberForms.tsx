"use client";

import { ActionForm } from "../../../lib/ActionForm";
import { addMemberAction, endMemberAction, moveMemberAction, updateMemberAction } from "./actions";

type Values = Record<string, string>;
export interface Option { value: string; label: string }

function PersonFields({ v, locations }: { v: Values; locations: Option[] }) {
  return (
    <div className="grid">
      <label>Location
        <select name="locationCode" defaultValue={v.locationCode ?? ""}>
          <option value="">(not set)</option>
          {locations.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </label>
      <label>Contracted hours<input name="contractedHours" type="number" step="any" defaultValue={v.contractedHours} /></label>
      <label>Role<input name="role" defaultValue={v.role} /></label>
      <label>Employment start<input name="employmentStart" type="date" defaultValue={v.employmentStart} /></label>
      <label>Employment end<input name="employmentEnd" type="date" defaultValue={v.employmentEnd} /></label>
    </div>
  );
}

function SharedBox({ v }: { v: Values }) {
  return (
    <label className="check">
      <input name="sharedResource" type="checkbox" defaultChecked={v.sharedResource === "on"} /> Shared resource
    </label>
  );
}

export function AddMemberForm({ teamId, locations, today }: { teamId: string; locations: Option[]; today: string }) {
  return (
    <ActionForm action={addMemberAction} hidden={{ teamId }} values={{ startDate: today }} submitLabel="Add member" label="Add member">
      {(v) => (
        <>
          <div className="grid">
            <label>Email<input name="email" type="text" defaultValue={v.email} /></label>
            <label>Team %<input name="teamAllocation" type="number" step="any" defaultValue={v.teamAllocation} /></label>
            <label>Start date<input name="startDate" type="date" defaultValue={v.startDate} /></label>
          </div>
          <SharedBox v={v} />
          <h2>Person</h2>
          <p className="muted">Used for a new person. If the email already exists, their saved details are kept; edit them afterwards.</p>
          <PersonFields v={v} locations={locations} />
        </>
      )}
    </ActionForm>
  );
}

export function EditMemberForm({ teamId, assignmentId, values, locations }: {
  teamId: string; assignmentId: string; values: Values; locations: Option[];
}) {
  return (
    <ActionForm action={updateMemberAction} hidden={{ teamId, assignmentId }} values={values} submitLabel="Save" label="Member details">
      {(v) => (
        <>
          <div className="grid">
            <label>Team %<input name="teamAllocation" type="number" step="any" defaultValue={v.teamAllocation} /></label>
          </div>
          <SharedBox v={v} />
          <PersonFields v={v} locations={locations} />
        </>
      )}
    </ActionForm>
  );
}

export function EndMemberForm({ teamId, assignmentId }: { teamId: string; assignmentId: string }) {
  return (
    <ActionForm action={endMemberAction} hidden={{ teamId, assignmentId }} values={{}} submitLabel="End membership" label="End membership">
      {(v) => <label>Last day on the team<input name="endDate" type="date" defaultValue={v.endDate} /></label>}
    </ActionForm>
  );
}

export function MoveMemberForm({ teamId, assignmentId, teams }: { teamId: string; assignmentId: string; teams: Option[] }) {
  return (
    <ActionForm action={moveMemberAction} hidden={{ teamId, assignmentId }} values={{}} submitLabel="Move" label="Move to another team">
      {(v) => (
        <div className="grid">
          <label>Move to team
            <select name="toTeamId" defaultValue={v.toTeamId ?? ""}>
              <option value="">(pick a team)</option>
              {teams.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label>First day on the new team<input name="date" type="date" defaultValue={v.date} /></label>
          <label>Team % (blank = keep)<input name="teamAllocation" type="number" step="any" defaultValue={v.teamAllocation} /></label>
        </div>
      )}
    </ActionForm>
  );
}
