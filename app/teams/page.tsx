import Link from "next/link";
import { listTeamsOverview } from "../../src/application/teams";
import { getDb, today } from "../../src/infrastructure/db/appDb";

export const dynamic = "force-dynamic";

/** FR-19: every team, active and retired, with links to plan and manage it. */
export default async function Teams({ searchParams }: { searchParams: Promise<{ warning?: string }> }) {
  const { warning } = await searchParams;
  const teams = await listTeamsOverview(await getDb(), today());
  return (
    <>
      <h1>Teams</h1>
      <p className="muted">{teams.filter((x) => x.status === "Active").length} active of {teams.length}. Retired teams stay here so past periods can still be reported.</p>
      {warning && <div role="status" className="notice">{warning.split("\n").map((w) => <p key={w}>Added, but note: {w}</p>)}</div>}
      <p><Link className="button" href="/teams/new">Add team</Link></p>
      <table className="members">
        <caption>All teams</caption>
        <thead><tr><th>ID</th><th>Name</th><th>Parent group</th><th>Lead</th><th>Members now</th><th>Status</th><th></th><th></th></tr></thead>
        <tbody>
          {teams.map((x) => (
            <tr key={x.id} className={x.status.startsWith("Retired") ? "muted" : ""}>
              <td>{x.id}</td>
              <td>{x.name}</td>
              <td>{x.parentGroup}</td>
              <td>{x.leadEmail}</td>
              <td>{x.members}</td>
              <td>{x.status}</td>
              <td><Link className="edit" href={`/teams/${x.id}`}>Planner</Link></td>
              <td><Link className="edit" href={`/teams/${x.id}/manage`}>Manage</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
