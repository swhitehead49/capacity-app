"use client";

import { ActionForm } from "@/app/lib/ActionForm";
import { addTeamAction, changeBaseLocationAction, changeValueStreamAction, renameTeamAction, retireTeamAction } from "./actions";

export interface Option { value: string; label: string }

export function AddTeamForm({ today, valueStreams, locations }: { today: string; valueStreams: string[]; locations: Option[] }) {
  return (
    <ActionForm action={addTeamAction} hidden={{}} values={{ effectiveFrom: today }} submitLabel="Add team" label="Add team">
      {(v) => (
        <div className="grid">
          <label>Team ID<input name="id" defaultValue={v.id} placeholder="e.g. T074" /></label>
          <label>Name<input name="name" defaultValue={v.name} /></label>
          <label>Value stream<input name="valueStream" list="value-streams" defaultValue={v.valueStream} /></label>
          <ValueStreamList valueStreams={valueStreams} />
          <label>Lead email<input name="leadEmail" defaultValue={v.leadEmail} /></label>
          <BaseLocationSelect value={v.baseLocation} locations={locations} />
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

/** Suggests existing value streams while still allowing a new one to be typed. */
function ValueStreamList({ valueStreams }: { valueStreams: string[] }) {
  return <datalist id="value-streams">{valueStreams.map((v) => <option key={v} value={v} />)}</datalist>;
}

export function ValueStreamForm({ teamId, current, valueStreams }: { teamId: string; current: string; valueStreams: string[] }) {
  return (
    <ActionForm action={changeValueStreamAction} hidden={{ teamId }} values={{ valueStream: current }} submitLabel="Change value stream" label="Value stream">
      {(v) => (
        <div className="grid">
          <label>Value stream<input name="valueStream" list="value-streams" defaultValue={v.valueStream} /></label>
          <ValueStreamList valueStreams={valueStreams} />
        </div>
      )}
    </ActionForm>
  );
}

/** Where the team is based (sean, 15 Nov 2026). Members keep their own location for public holidays. */
function BaseLocationSelect({ value, locations }: { value: string | undefined; locations: Option[] }) {
  return (
    <label>Base location
      <select name="baseLocation" defaultValue={value ?? ""}>
        <option value="">(not set)</option>
        {locations.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>
    </label>
  );
}

export function BaseLocationForm({ teamId, current, locations }: { teamId: string; current: string; locations: Option[] }) {
  return (
    <ActionForm action={changeBaseLocationAction} hidden={{ teamId }} values={{ baseLocation: current }} submitLabel="Change base location" label="Base location">
      {(v) => <div className="grid"><BaseLocationSelect value={v.baseLocation} locations={locations} /></div>}
    </ActionForm>
  );
}
