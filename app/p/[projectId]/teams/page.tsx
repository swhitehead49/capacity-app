import Link from "next/link";
import { listTeamCountries } from "@/src/application/teams";
import { listProjectTeams, projectStreamNames } from "@/src/application/projectValueStreams";
import { groupByValueStream } from "@/src/domain/organisation/teamGroups";
import { today } from "@/src/infrastructure/db/appDb";
import { projectDb } from "@/app/lib/project";

export const dynamic = "force-dynamic";

/** FR-19: the project's teams, active and retired, with links to plan and manage them, grouped by value stream and
 *  filterable by value stream and country (sean, 15 Nov 2026). Teams come from the master team list (Reference data → Teams). */
export default async function Teams({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ valueStream?: string; country?: string }> }) {
  const { projectId } = await params;
  const { valueStream, country } = await searchParams;
  const db = (await projectDb(projectId)).db;
  const teams = await listProjectTeams(db, today(), { valueStream: valueStream || undefined, country: country || undefined });
  const valueStreams = await projectStreamNames(db);
  const countries = await listTeamCountries(db);
  return (
    <>
      <h1>Teams</h1>
      <p className="muted">{teams.filter((x) => x.status === "Active").length} active of {teams.length}. Retired teams stay here so past periods can still be reported.</p>
      <p className="muted">The teams in this project&apos;s value streams, plus any included teams without one (see <Link href={`/p/${projectId}`}>Project home</Link>).
        Teams are added and edited by an Admin in the master team list.</p>
      <div className="toolbar">
        <form className="picker inline" method="get">
          <label>Show value stream
            <select name="valueStream" defaultValue={valueStream ?? ""}>
              <option value="">All</option>
              {valueStreams.map((v) => <option key={v}>{v}</option>)}
            </select>
          </label>
          <label>Country (of base location)
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
        <thead><tr><th>ID</th><th>Name</th><th>Value stream</th><th>Parent team</th><th>Base location</th><th>Lead</th><th>Members now</th><th>Status</th><th></th><th></th></tr></thead>
        {teams.length === 0 && <tbody><tr><td colSpan={10} className="empty">No teams{valueStream || country ? " match these filters" : " in this project yet. Add a value stream on Project home"}.</td></tr></tbody>}
        {groupByValueStream(teams).map(([stream, group]) => (
        <tbody key={stream}>
          <tr className="group"><th colSpan={10} scope="rowgroup">{stream}</th></tr>
          {group.map((x) => (
            <tr key={x.id} className={x.status.startsWith("Retired") ? "muted" : ""}>
              <td>{x.id}</td>
              <td>{x.name}</td>
              <td>{x.valueStream}</td>
              <td>{x.parentTeamName}</td>
              <td>{x.baseLocation ?? ""}</td>
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
