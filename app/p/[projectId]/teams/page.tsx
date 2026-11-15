import Link from "next/link";
import { listTeamCountries, listTeamsOverview, listValueStreams } from "@/src/application/teams";
import { groupByValueStream } from "@/src/domain/organisation/teamGroups";
import { today } from "@/src/infrastructure/db/appDb";
import { projectDb } from "@/app/lib/project";

export const dynamic = "force-dynamic";

/** FR-19: every team, active and retired, with links to plan and manage it. Opening a project lands here,
 *  grouped by value stream and filterable by value stream and country (sean, 15 Nov 2026). */
export default async function Teams({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ warning?: string; valueStream?: string; country?: string; imported?: string }> }) {
  const { projectId } = await params;
  const { warning, valueStream, country, imported } = await searchParams;
  const db = (await projectDb(projectId)).db;
  const teams = await listTeamsOverview(db, today(), { valueStream: valueStream || undefined, country: country || undefined });
  const valueStreams = await listValueStreams(db);
  const countries = await listTeamCountries(db);
  return (
    <>
      <h1>Teams</h1>
      <p className="muted">{teams.filter((x) => x.status === "Active").length} active of {teams.length}. Retired teams stay here so past periods can still be reported.</p>
      {(warning || imported) && (
        <div role="status" className="notice">
          {imported && <p>Imported {imported} teams.</p>}
          {warning?.split("\n").map((w) => <p key={w}>Added, but note: {w}</p>)}
        </div>
      )}
      <div className="toolbar">
        <div className="actions">
          <Link className="button" href={`/p/${projectId}/teams/new`}>Add team</Link>
          <Link className="button secondary" href={`/p/${projectId}/teams/import`}>Import from spreadsheet</Link>
        </div>
        <form className="picker inline" method="get">
          <label>Show value stream
            <select name="valueStream" defaultValue={valueStream ?? ""}>
              <option value="">All</option>
              {valueStreams.map((v) => <option key={v}>{v}</option>)}
            </select>
          </label>
          <label>Country
            <select name="country" defaultValue={country ?? ""}>
              <option value="">All</option>
              {countries.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <button type="submit" className="secondary">Show</button>
        </form>
      </div>
      <table className="members">
        <caption>All teams</caption>
        <thead><tr><th>ID</th><th>Name</th><th>Value stream</th><th>Countries</th><th>Lead</th><th>Members now</th><th>Status</th><th></th><th></th></tr></thead>
        {teams.length === 0 && <tbody><tr><td colSpan={9} className="empty">No teams{valueStream || country ? " match these filters" : " yet. Add one, or import them from a spreadsheet"}.</td></tr></tbody>}
        {groupByValueStream(teams).map(([stream, group]) => (
        <tbody key={stream}>
          <tr className="group"><th colSpan={9} scope="rowgroup">{stream}</th></tr>
          {group.map((x) => (
            <tr key={x.id} className={x.status.startsWith("Retired") ? "muted" : ""}>
              <td>{x.id}</td>
              <td>{x.name}</td>
              <td>{x.valueStream}</td>
              <td>{x.countries.join(", ")}</td>
              <td>{x.leadEmail}</td>
              <td>{x.members}</td>
              <td>{x.status}</td>
              <td><Link className="edit" href={`/p/${projectId}/teams/${x.id}`}>Planner</Link></td>
              <td><Link className="edit" href={`/p/${projectId}/teams/${x.id}/manage`}>Manage</Link></td>
            </tr>
          ))}
        </tbody>
        ))}
      </table>
    </>
  );
}
