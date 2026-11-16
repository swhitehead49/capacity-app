"use client";

import Link from "next/link";
import { ActionForm, type Values } from "@/app/lib/ActionForm";
import { ID_STATUSES } from "@/src/domain/organisation/teamDetails";
import { deleteTeamAction, saveMasterTeamsAction } from "./actions";

export interface Option { value: string; label: string }
export interface MasterRow { id: string; parentTeamName: string | null }

/**
 * The master team list as an editable table (sean, 16 Nov 2026): name, value stream, base location, lead email and
 * ID status for every team, saved together. Other details, the name history and Delete are on each team's Edit page.
 */
export function MasterTable({ groups, values, valueStreams, locations }: {
  groups: [string, MasterRow[]][]; values: Values; valueStreams: string[]; locations: Option[];
}) {
  return (
    <ActionForm action={saveMasterTeamsAction} hidden={{}} values={values} submitLabel="Save changes" label="Edit teams">
      {(v) => (
        <table className="members editable">
          <caption>Master team list</caption>
          <thead><tr><th>ID</th><th>Name</th><th>Value stream</th><th>Base location</th><th>Lead email</th><th>ID status</th><th>Parent team</th><th></th></tr></thead>
          {groups.map(([stream, rows]) => (
            <tbody key={stream}>
              <tr className="group"><th colSpan={8} scope="rowgroup">{stream}</th></tr>
              {rows.map((x) => (
                <tr key={x.id}>
                  <td>{x.id}<input type="hidden" name="teamId" value={x.id} /></td>
                  <td><input name={`name:${x.id}`} aria-label={`Name of ${x.id}`} defaultValue={v[`name:${x.id}`]} /></td>
                  <td>
                    <select name={`valueStream:${x.id}`} aria-label={`Value stream of ${x.id}`} defaultValue={v[`valueStream:${x.id}`]}>
                      <option value="">(none)</option>
                      {valueStreams.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <select name={`baseLocation:${x.id}`} aria-label={`Base location of ${x.id}`} defaultValue={v[`baseLocation:${x.id}`]}>
                      <option value="">(not set)</option>
                      {locations.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </td>
                  <td><input name={`leadEmail:${x.id}`} aria-label={`Lead email of ${x.id}`} defaultValue={v[`leadEmail:${x.id}`]} /></td>
                  <td>
                    <select name={`idStatus:${x.id}`} aria-label={`ID status of ${x.id}`} defaultValue={v[`idStatus:${x.id}`]}>
                      {ID_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>{x.parentTeamName}</td>
                  <td><Link className="edit" href={`/reference/teams/${encodeURIComponent(x.id)}`}>Edit</Link></td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      )}
    </ActionForm>
  );
}

export function DeleteTeamForm({ teamId }: { teamId: string }) {
  return (
    <ActionForm action={deleteTeamAction} hidden={{ teamId }} values={{}} submitLabel="Delete team" label="Delete team">
      {() => <p className="muted">This can&apos;t be undone. The ID becomes free again.</p>}
    </ActionForm>
  );
}
