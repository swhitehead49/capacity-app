import Link from "next/link";
import { listLocations } from "@/src/application/lookups";
import { getReferenceData } from "@/src/application/referenceData";
import { MasterTable } from "./MasterTable";
import { listTeamsOverview } from "@/src/application/teams";
import { groupByValueStream } from "@/src/domain/organisation/teamGroups";
import { today } from "@/src/infrastructure/db/appDb";
import { sharedDb } from "@/app/lib/project";

export const dynamic = "force-dynamic";

/**
 * Reference data, Teams tab (sean, 15 Nov 2026): the master team list. Every team is kept here once; a project's
 * teams are the ones in its value streams. Members, allocations and plans are kept by each project.
 */
export default async function MasterTeams({ searchParams }: { searchParams: Promise<{ warning?: string; imported?: string; saved?: string; deleted?: string; error?: string }> }) {
  const { warning, imported, saved, deleted, error } = await searchParams;
  const shared = await sharedDb();
  const teams = await listTeamsOverview(shared, today());
  const { valueStreams } = await getReferenceData(shared);
  return (
    <>
      <h2>Teams</h2>
      <p className="muted">The master team list. Each project&apos;s teams are the ones in its value streams, so a team&apos;s value stream
        decides which projects it is in. Edit the table and press Save changes; Edit on a row has the other details, the name history and, for a Provisional team nothing uses yet, Delete. Engineering managers keep each team&apos;s members, allocations and plans in their project.</p>
      {error && <div role="alert" aria-label="Problems deleting" className="errors"><p>{error}</p></div>}
      {(warning || imported || saved || deleted) && (
        <div role="status" className="notice">
          {imported && <p>Imported {imported} teams.</p>}
          {saved && <p>Saved changes to {saved} team{saved === "1" ? "" : "s"}.</p>}
          {deleted && <p>Deleted {deleted}.</p>}
          {warning?.split("\n").map((w) => <p key={w}>Added, but note: {w}</p>)}
        </div>
      )}
      <div className="actions">
        <Link className="button" href="/reference/teams/new">Add team</Link>
        <Link className="button secondary" href="/reference/teams/import">Import from spreadsheet</Link>
      </div>
      <MasterTable groups={groupByValueStream(teams).map(([stream, rows]) => [stream, rows.map((x) => ({ id: x.id, parentTeamName: x.parentTeamName, provisional: x.idStatus === "Provisional" }))])}
        values={Object.fromEntries(teams.flatMap((x) => [
          [`name:${x.id}`, x.name], [`valueStream:${x.id}`, x.valueStream ?? ""], [`baseLocation:${x.id}`, x.baseLocation ?? ""],
          [`leadEmail:${x.id}`, x.leadEmail ?? ""], [`idStatus:${x.id}`, x.idStatus],
        ]))}
        valueStreams={valueStreams} locations={await listLocations(shared)} />
    </>
  );
}
