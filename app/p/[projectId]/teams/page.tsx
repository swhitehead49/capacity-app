import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TEAM_COOKIE } from "@/app/lib/rememberedProject";
import { listTeamCountries } from "@/src/application/teams";
import { listProjectTeams, projectStreamNames } from "@/src/application/projectValueStreams";
import { listTeamDefaults } from "@/src/application/getTeamDefaults";
import { resolveStandard } from "@/src/application/standardAllocation";
import { formatDate, percent } from "@/app/lib/format";
import { groupByValueStream } from "@/src/domain/organisation/teamGroups";
import { today } from "@/src/infrastructure/db/appDb";
import { projectDb, sharedDb } from "@/app/lib/project";

export const dynamic = "force-dynamic";

/** Team planning (sean, 16 Nov 2026): choose your team. FR-19: the project's teams, active and retired, with links to plan and manage them, grouped by value stream and
 *  filterable by value stream and country (sean, 15 Nov 2026). Teams come from the master team list (Reference data → Teams). */
export default async function Teams({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ valueStream?: string; country?: string; choose?: string; view?: string }> }) {
  const { projectId } = await params;
  const { valueStream, country, choose, view } = await searchParams;
  const showCapacity = view === "capacity";
  const db = (await projectDb(projectId)).db;
  const teams = await listProjectTeams(db, today(), { valueStream: valueStream || undefined, country: country || undefined });
  const valueStreams = await projectStreamNames(db);
  const countries = await listTeamCountries(db);
  // The team chosen last time opens straight away (sean, 16 Nov 2026), unless you asked to change team.
  const [rememberedProject, rememberedTeam] = ((await cookies()).get(TEAM_COOKIE)?.value ?? "").split("/");
  if (!choose && !valueStream && !country && rememberedProject === projectId && teams.some((x) => x.id === rememberedTeam && !x.status.startsWith("Retired"))) {
    redirect(`/p/${projectId}/teams/${rememberedTeam}/members`);
  }
  return (
    <>
      <h1>Team planning</h1>
      <p><strong>Choose your team.</strong> You can change team at any time.</p>
      <p className="muted">{teams.filter((x) => x.status === "Active").length} active of {teams.length}. Retired teams stay here so past periods can still be reported.</p>
      <p className="muted">The teams the Admin has put in this project (see <Link href={`/p/${projectId}`}>Project home</Link>).
        Teams are added and edited by an Admin in the master team list.</p>
      <p><Link className="button secondary" href={`/p/${projectId}/import-members`}>Import team members from spreadsheet</Link></p>
      <div className="toolbar">
        <form className="picker inline" method="get">
          <input type="hidden" name="choose" value="1" />
          {showCapacity && <input type="hidden" name="view" value="capacity" />}
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
      <nav className="tabs" aria-label="Team lists">
        <Link href={tabLink(projectId, null, valueStream, country)} aria-current={showCapacity ? undefined : "page"}>Team details</Link>
        <Link href={tabLink(projectId, "capacity", valueStream, country)} aria-current={showCapacity ? "page" : undefined}>Default capacity</Link>
      </nav>
      {showCapacity ? await DefaultCapacity({ projectId, db, teams }) : (
      <table className="members">
        <caption>All teams</caption>
        <thead><tr><th>ID</th><th>Name</th><th>Value stream</th><th>Parent team</th><th>Base location</th><th>Lead</th><th>Members now</th><th>Status</th></tr></thead>
        {teams.length === 0 && <tbody><tr><td colSpan={8} className="empty">No teams{valueStream || country ? " match these filters" : " in this project yet. The Admin adds them in Reference data → Projects"}.</td></tr></tbody>}
        {groupByValueStream(teams).map(([stream, group]) => (
        <tbody key={stream}>
          <tr className="group"><th colSpan={8} scope="rowgroup">{stream}</th></tr>
          {group.map((x) => (
            <tr key={x.id} className={x.status.startsWith("Retired") ? "muted" : ""}>
              <td>{x.id}</td>
              <td><Link href={`/p/${projectId}/teams/${x.id}/members`}>{x.name}</Link></td>
              <td>{x.valueStream}</td>
              <td>{x.parentTeamName}</td>
              <td>{x.baseLocation ?? ""}</td>
              <td>{x.leadEmail}</td>
              <td>{x.members}</td>
              <td>{x.status}</td>
            </tr>
          ))}
        </tbody>
        ))}
      </table>
      )}
    </>
  );
}

/** The two lists on Team planning keep the filters when you switch (sean, 22 Nov 2026). */
function tabLink(projectId: string, view: string | null, valueStream?: string, country?: string): string {
  const query = new URLSearchParams({ choose: "1" });
  if (view) query.set("view", view);
  if (valueStream) query.set("valueStream", valueStream);
  if (country) query.set("country", country);
  return `/p/${projectId}/teams?${query}`;
}

type TeamRow = Awaited<ReturnType<typeof listProjectTeams>>[number];

/** sean, 22 Nov 2026: every team's default capacity split in force today, and whether it is the project's standard. */
async function DefaultCapacity({ projectId, db, teams }: { projectId: string; db: Awaited<ReturnType<typeof projectDb>>["db"]; teams: TeamRow[] }) {
  const standard = (await resolveStandard(db, await sharedDb()))?.standard ?? null;
  const defaults = new Map((await listTeamDefaults(db, { teamIds: teams.map((x) => x.id), today: today(), standard })).map((d) => [d.teamId, d]));
  const pct = (n: number | null | undefined) => (n === null || n === undefined ? "" : `${percent(n)}%`);
  return (
    <table className="members">
      <caption>Default capacity</caption>
      <thead><tr>
        <th>ID</th><th>Name</th><th>Organisational</th><th>Unplanned</th><th>Maintenance</th><th>Technical improvements</th><th>Change</th>
        <th>Enabling / Training</th><th>From</th><th>Standard or own</th>
      </tr></thead>
      {teams.length === 0 && <tbody><tr><td colSpan={10} className="empty">No teams.</td></tr></tbody>}
      {groupByValueStream(teams).map(([stream, group]) => (
        <tbody key={stream}>
          <tr className="group"><th colSpan={10} scope="rowgroup">{stream}</th></tr>
          {group.map((x) => {
            const d = defaults.get(x.id);
            return (
              <tr key={x.id} className={x.status.startsWith("Retired") ? "muted" : ""}>
                <td>{x.id}</td>
                <td><Link href={`/p/${projectId}/teams/${x.id}/default`}>{x.name}</Link></td>
                <td>{pct(d?.overhead)}</td><td>{pct(d?.split ? d.contingency ?? 0 : null)}</td>
                <td>{pct(d?.split ? d.split.run + d.split.fix : null)}</td><td>{pct(d?.split?.sustain)}</td><td>{pct(d?.split?.change)}</td>
                <td>{pct(d?.split?.enabling)}</td>
                <td>{d?.effectiveFrom ? formatDate(d.effectiveFrom) : ""}</td>
                <td className={d?.source === "No active default" ? "status-Provisional" : ""}>{d?.source}</td>
              </tr>
            );
          })}
        </tbody>
      ))}
    </table>
  );
}
