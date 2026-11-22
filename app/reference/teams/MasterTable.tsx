"use client";

import Link from "next/link";
import { ActionForm, type Values } from "@/app/lib/ActionForm";
import { ID_STATUSES, TEAM_TYPES } from "@/src/domain/organisation/teamDetails";
import { deleteProvisionalTeamsAction, deleteTeamAction, purgeTeamAction, saveMasterTeamsAction } from "./actions";

export interface Option { value: string; label: string }
export interface MasterRow { id: string; parentTeamName: string | null; grandparentTeamName: string | null; provisional: boolean }

/**
 * The master team list as an editable table (sean, 16 Nov 2026): name, value stream, base location, team type and
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
          <thead><tr><th>ID</th><th className="team-name">Team Name</th><th>Parent Team Name</th><th>Grandparent Team Name</th><th>Value stream</th><th>Base location</th><th>Team type</th><th>ID status</th><th></th><th></th></tr></thead>
          {groups.map(([stream, rows]) => (
            <tbody key={stream}>
              <tr className="group"><th colSpan={10} scope="rowgroup">{stream}</th></tr>
              {rows.map((x) => (
                <tr key={x.id}>
                  <td>{x.id}<input type="hidden" name="teamId" value={x.id} /></td>
                  <td className="team-name"><input name={`name:${x.id}`} aria-label={`Name of ${x.id}`} defaultValue={v[`name:${x.id}`]} /></td>
                  <td>{x.parentTeamName}</td>
                  <td>{x.grandparentTeamName}</td>
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
                  <td>
                    <select name={`teamType:${x.id}`} aria-label={`Team type of ${x.id}`} defaultValue={v[`teamType:${x.id}`]}>
                      <option value="">(not set)</option>
                      {TEAM_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <select name={`idStatus:${x.id}`} aria-label={`ID status of ${x.id}`} defaultValue={v[`idStatus:${x.id}`]}>
                      {ID_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><Link className="edit" href={`/reference/teams/${encodeURIComponent(x.id)}`}>Edit</Link></td>
                  <td>
                    {x.provisional && (
                      <Link className="edit danger" href={`/reference/teams/${encodeURIComponent(x.id)}/delete`} aria-label={`Delete ${x.id}`}>Delete</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      )}
    </ActionForm>
  );
}

/** The confirmation step before a team is deleted (sean, 16 Nov 2026). */
export function DeleteTeamForm({ teamId }: { teamId: string }) {
  return (
    <ActionForm action={deleteTeamAction} hidden={{ teamId }} values={{}} submitLabel={`Yes, delete ${teamId}`} label="Delete team">
      {() => <p>This can&apos;t be undone. The team goes from the master list and every project, and its ID becomes free again.</p>}
    </ActionForm>
  );
}

/** FR-18q (sean, 22 Nov 2026): delete every unused Provisional team, after typing DELETE. */
export function DeleteProvisionalTeamsForm({ count }: { count: number }) {
  return (
    <ActionForm action={deleteProvisionalTeamsAction} hidden={{}} values={{}} submitLabel={`Delete ${count} provisional teams`} label="Delete all provisional teams">
      {(v) => <label>Type DELETE to confirm<input name="confirm" defaultValue={v.confirm} autoComplete="off" /></label>}
    </ActionForm>
  );
}

/** Delete a team and all its data: the team ID must be typed (sean, 16 Nov 2026). */
export function PurgeTeamForm({ teamId }: { teamId: string }) {
  return (
    <ActionForm action={purgeTeamAction} hidden={{ teamId }} values={{}} submitLabel="Delete team and all its data" label="Delete team and all its data">
      {(v) => <label>Type {teamId} to confirm<input name="confirm" defaultValue={v.confirm} autoComplete="off" /></label>}
    </ActionForm>
  );
}
