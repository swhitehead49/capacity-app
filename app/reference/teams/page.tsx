import Link from "next/link";
import { listTeamsOverview } from "@/src/application/teams";
import { groupByValueStream } from "@/src/domain/organisation/teamGroups";
import { today } from "@/src/infrastructure/db/appDb";
import { sharedDb } from "@/app/lib/project";

export const dynamic = "force-dynamic";

/**
 * Reference data, Teams tab (sean, 15 Nov 2026): the master team list. Every team is kept here once; a project's
 * teams are the ones in its value streams. Members, allocations and plans are kept by each project.
 */
export default async function MasterTeams({ searchParams }: { searchParams: Promise<{ warning?: string; imported?: string }> }) {
  const { warning, imported } = await searchParams;
  const teams = await listTeamsOverview(await sharedDb(), today());
  return (
    <>
      <h2>Teams</h2>
      <p className="muted">The master team list. Each project&apos;s teams are the ones in its value streams, so a team&apos;s value stream
        decides which projects it is in. Engineering managers keep each team&apos;s members, allocations and plans in their project.</p>
      {(warning || imported) && (
        <div role="status" className="notice">
          {imported && <p>Imported {imported} teams.</p>}
          {warning?.split("\n").map((w) => <p key={w}>Added, but note: {w}</p>)}
        </div>
      )}
      <div className="actions">
        <Link className="button" href="/reference/teams/new">Add team</Link>
        <Link className="button secondary" href="/reference/teams/import">Import from spreadsheet</Link>
      </div>
      <table className="members">
        <caption>Master team list</caption>
        <thead><tr><th>ID</th><th>Name</th><th>Value stream</th><th>Parent team</th><th>Base location</th><th>Lead</th><th>ID status</th><th></th></tr></thead>
        {teams.length === 0 && <tbody><tr><td colSpan={8} className="empty">No teams yet. Add one, or import them from a spreadsheet.</td></tr></tbody>}
        {groupByValueStream(teams).map(([stream, group]) => (
          <tbody key={stream}>
            <tr className="group"><th colSpan={8} scope="rowgroup">{stream}</th></tr>
            {group.map((x) => (
              <tr key={x.id}>
                <td>{x.id}</td>
                <td>{x.name}</td>
                <td>{x.valueStream}</td>
                <td>{x.parentTeamName}</td>
                <td>{x.baseLocation ?? ""}</td>
                <td>{x.leadEmail}</td>
                <td>{x.idStatus}</td>
                <td><Link className="edit" href={`/reference/teams/${encodeURIComponent(x.id)}`}>Edit</Link></td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </>
  );
}
