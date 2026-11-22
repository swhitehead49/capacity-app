"use client";

// The master team list's forms (sean, 15 Nov 2026): the Admin edits teams in Reference data → Teams.

import { ActionForm } from "@/app/lib/ActionForm";
import { ID_STATUSES, TEAM_TYPES } from "@/src/domain/organisation/teamDetails";
import { addTeamAction, changeBaseLocationAction, changeValueStreamAction, updateTeamDetailsAction, renameTeamAction, retireTeamAction } from "./actions";

export interface Option { value: string; label: string }

export function AddTeamForm({ today, valueStreams, locations }: { today: string; valueStreams: string[]; locations: Option[] }) {
  return (
    <ActionForm action={addTeamAction} hidden={{}} values={{ effectiveFrom: today }} submitLabel="Add team" label="Add team">
      {(v) => (
        <div className="grid">
          <label>Team ID<input name="id" defaultValue={v.id} placeholder="e.g. T074" /></label>
          <label>Name<input name="name" defaultValue={v.name} /></label>
          <ValueStreamSelect value={v.valueStream} valueStreams={valueStreams} />
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

/** UC17: retire a team in every project at once (sean, 16 Nov 2026). */
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

/** A value stream from the system's reference data (sean, 15 Nov 2026). */
function ValueStreamSelect({ value, valueStreams }: { value: string | undefined; valueStreams: string[] }) {
  return (
    <label>Value stream
      <select name="valueStream" defaultValue={value ?? ""}>
        <option value="">(none)</option>
        {valueStreams.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
    </label>
  );
}

export function ValueStreamForm({ teamId, current, valueStreams }: { teamId: string; current: string; valueStreams: string[] }) {
  return (
    <ActionForm action={changeValueStreamAction} hidden={{ teamId }} values={{ valueStream: current }} submitLabel="Change value stream" label="Value stream">
      {(v) => (
        <div className="grid">
          <ValueStreamSelect value={v.valueStream} valueStreams={valueStreams} />
        </div>
      )}
    </ActionForm>
  );
}

/** Where the team is based: a country (sean, 15 Nov 2026; FR-18t). Members have their own location for public holidays. */
function BaseLocationSelect({ value, locations }: { value: string | undefined; locations: Option[] }) {
  return (
    <label>Base location (country)
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

/** The workbook's team attributes (sean, 15 Nov 2026). */
export function DetailsForm({ teamId, values }: { teamId: string; values: Record<string, string> }) {
  return (
    <ActionForm action={updateTeamDetailsAction} hidden={{ teamId }} values={values} submitLabel="Save details" label="Details">
      {(v) => (
        <div className="grid">
          <label>Team lead first name<input name="teamLeadFirstName" defaultValue={v.teamLeadFirstName} autoComplete="off" /></label>
          <label>Team lead last name<input name="teamLeadLastName" defaultValue={v.teamLeadLastName} autoComplete="off" /></label>
          <label>Team lead email<input name="leadEmail" defaultValue={v.leadEmail} /></label>
          <label>Parent team name<input name="parentTeamName" defaultValue={v.parentTeamName} /></label>
          <label>Parent team lead first name<input name="parentTeamLeadFirstName" defaultValue={v.parentTeamLeadFirstName} autoComplete="off" /></label>
          <label>Parent team lead last name<input name="parentTeamLeadLastName" defaultValue={v.parentTeamLeadLastName} autoComplete="off" /></label>
          <label>Parent team lead email<input name="parentTeamLeadEmail" defaultValue={v.parentTeamLeadEmail} /></label>
          <label>Grandparent team name<input name="grandparentTeamName" defaultValue={v.grandparentTeamName} /></label>
          <label>Grandparent team lead first name<input name="grandparentTeamLeadFirstName" defaultValue={v.grandparentTeamLeadFirstName} autoComplete="off" /></label>
          <label>Grandparent team lead last name<input name="grandparentTeamLeadLastName" defaultValue={v.grandparentTeamLeadLastName} autoComplete="off" /></label>
          <label>Grandparent team lead email<input name="grandparentTeamLeadEmail" defaultValue={v.grandparentTeamLeadEmail} /></label>
          <label>Top-level group<input name="topLevelGroup" defaultValue={v.topLevelGroup} /></label>
          <label>Top-level lead first name<input name="topLevelLeadFirstName" defaultValue={v.topLevelLeadFirstName} autoComplete="off" /></label>
          <label>Top-level lead last name<input name="topLevelLeadLastName" defaultValue={v.topLevelLeadLastName} autoComplete="off" /></label>
          <label>Top-level lead email<input name="topLevelLeadEmail" defaultValue={v.topLevelLeadEmail} /></label>
          <label>Source headcount<input name="sourceHeadcount" type="number" step="1" min="0" defaultValue={v.sourceHeadcount} /></label>
          <label>ID status
            <select name="idStatus" defaultValue={v.idStatus}>{ID_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <label>Data quality flag<input name="dataQualityFlag" defaultValue={v.dataQualityFlag} /></label>
          <label>Team type
            <select name="teamType" defaultValue={v.teamType}>
              <option value="">(not set)</option>
              {TEAM_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
      )}
    </ActionForm>
  );
}
