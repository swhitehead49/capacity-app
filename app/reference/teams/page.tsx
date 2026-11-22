import Link from "next/link";
import { listBaseCountries } from "@/src/application/lookups";
import { getReferenceData } from "@/src/application/referenceData";
import { MasterTable } from "./MasterTable";
import { listTeamsOverview } from "@/src/application/teams";
import { filterTeams, groupByValueStream, hierarchyOptions } from "@/src/domain/organisation/teamGroups";
import { today } from "@/src/infrastructure/db/appDb";
import { sharedDb } from "@/app/lib/project";

export const dynamic = "force-dynamic";

/**
 * Reference data, Teams tab (sean, 15 Nov 2026): the master team list. Every team is kept here once; a project's
 * teams are the ones in its value streams. Members, allocations and plans are kept by each project.
 */
export default async function MasterTeams({ searchParams }: { searchParams: Promise<{ warning?: string; imported?: string; saved?: string; deleted?: string; bulkDeleted?: string; kept?: string; name?: string; parent?: string; grandparent?: string }> }) {
  const { warning, imported, saved, deleted, bulkDeleted, kept, name, parent, grandparent } = await searchParams;
  const shared = await sharedDb();
  const all = await listTeamsOverview(shared, today());
  const teams = filterTeams(all, { name, parent, grandparent });
  const { parents, grandparents } = hierarchyOptions(all);
  const filtered = Boolean(name || parent || grandparent);
  const { valueStreams } = await getReferenceData(shared);
  return (
    <>
      <h2>Teams</h2>
      <p className="muted">The master team list. Each project&apos;s teams are the ones in its value streams, so a team&apos;s value stream
        decides which projects it is in. Edit the table and press Save changes; Edit on a row has the other details, the name history and, for a Provisional team nothing uses yet, Delete. Engineering managers keep each team&apos;s members, allocations and plans in their project.</p>
      {(warning || imported || saved || deleted || bulkDeleted) && (
        <div role="status" className="notice">
          {imported && <p>Imported {imported} teams.</p>}
          {saved && <p>Saved changes to {saved} team{saved === "1" ? "" : "s"}.</p>}
          {deleted && <p>Deleted {deleted}.</p>}
          {bulkDeleted && <p>Deleted {bulkDeleted} provisional team{bulkDeleted === "1" ? "" : "s"}.</p>}
          {kept?.split("\n").map((k) => <p key={k}>Kept {k}</p>)}
          {warning?.split("\n").map((w) => <p key={w}>Added, but note: {w}</p>)}
        </div>
      )}
      <div className="actions">
        <Link className="button" href="/reference/teams/new">Add team</Link>
        <Link className="button secondary" href="/reference/teams/import">Import from spreadsheet</Link>
        <Link className="button secondary danger" href="/reference/teams/delete-provisional">Delete all provisional teams</Link>
      </div>
      <div className="toolbar">
      <form className="picker inline" method="get" aria-label="Filter teams">
        <label>Team Name<input name="name" defaultValue={name ?? ""} placeholder="Part of the name" /></label>
        <label>Parent Team Name
          <select name="parent" defaultValue={parent ?? ""}>
            <option value="">All</option>
            {parents.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label>Grandparent Team Name
          <select name="grandparent" defaultValue={grandparent ?? ""}>
            <option value="">All</option>
            {grandparents.map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <button type="submit" className="secondary">Filter</button>
        {filtered && <Link href="/reference/teams">Show all</Link>}
      </form>
      </div>
      {filtered && <p className="muted">Showing {teams.length} of {all.length} teams.</p>}
      <MasterTable groups={groupByValueStream(teams).map(([stream, rows]) => [stream, rows.map((x) => ({ id: x.id, parentTeamName: x.parentTeamName, grandparentTeamName: x.grandparentTeamName, provisional: x.idStatus === "Provisional" }))])}
        values={Object.fromEntries(teams.flatMap((x) => [
          [`name:${x.id}`, x.name], [`valueStream:${x.id}`, x.valueStream ?? ""], [`baseLocation:${x.id}`, x.baseLocation ?? ""],
          [`idStatus:${x.id}`, x.idStatus], [`parentTeamName:${x.id}`, x.parentTeamName ?? ""], [`grandparentTeamName:${x.id}`, x.grandparentTeamName ?? ""], [`teamType:${x.id}`, x.teamType ?? ""],
        ]))}
        valueStreams={valueStreams} locations={await listBaseCountries(shared)} />
    </>
  );
}
