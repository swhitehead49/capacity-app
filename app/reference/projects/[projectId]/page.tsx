import Link from "next/link";
import { getProjectSetup } from "@/src/application/projectValueStreams";
import { groupByValueStream } from "@/src/domain/organisation/teamGroups";
import { today } from "@/src/infrastructure/db/appDb";
import { projectDb, sharedDb } from "@/app/lib/project";
import { updateTeamsAction, updateValueStreamsAction } from "../actions";

export const dynamic = "force-dynamic";

/**
 * FR-18s (sean, 22 Nov 2026): the Admin sets up a project. A team is in the project when its tick is on. Ticking a value
 * stream (and pressing Update) ticks all its teams, unticking it unticks them; single teams can then be changed below.
 */
export default async function ProjectSetup({ params, searchParams }: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ created?: string; streams?: string; added?: string; removed?: string; teams?: string; error?: string }>;
}) {
  const { projectId } = await params;
  const { created, streams, added, removed, teams: teamsChanged, error } = await searchParams;
  const { project, db } = await projectDb(projectId);
  const setup = await getProjectSetup(db, today(), await sharedDb());
  const inProject = setup.teams.filter((x) => x.included).length;
  return (
    <>
      <p className="muted"><Link href="/reference/projects">← Projects</Link></p>
      <h2>Set up {project.name}</h2>
      <p className="muted">A team is in the project when it is ticked. Ticking a value stream puts all its teams in; you can then
        leave single teams out, or add teams from other value streams or with none. Each section has its own Update button.</p>
      {(created || streams || teamsChanged) && (
        <div role="status" className="notice">
          {created && <p>Created {project.name}. Tick its value streams and teams.</p>}
          {streams && !added && !removed && <p>No change to the value streams.</p>}
          {added && <p>Added {added.split("\n").join(", ")}, with all their teams.</p>}
          {removed && <p>Removed {removed.split("\n").join(", ")}, and their teams.</p>}
          {teamsChanged && <p>Updated {teamsChanged} team{teamsChanged === "1" ? "" : "s"}.</p>}
        </div>
      )}
      {error && <div role="alert" className="errors">{error.split("\n").map((e) => <p key={e}>{e}</p>)}</div>}

      <h3>Value streams</h3>
      <form action={updateValueStreamsAction} aria-label="Value streams in the project">
        <input type="hidden" name="projectId" value={project.id} />
        <table className="members narrow">
          <caption>Value streams</caption>
          <thead><tr><th>Include</th><th>Value stream</th><th>Teams</th></tr></thead>
          <tbody>
            {setup.valueStreams.length === 0 && <tr><td colSpan={3} className="empty">No value streams yet: add them on the Value streams tab.</td></tr>}
            {setup.valueStreams.map((v) => (
              <tr key={v.name}>
                <td><input type="checkbox" name="valueStream" value={v.name} defaultChecked={v.included} aria-label={`Include ${v.name}`} /></td>
                <td>{v.name}</td>
                <td>{v.teams}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="submit">Update value streams</button>
      </form>

      <h3>Teams</h3>
      <p className="muted">{inProject} of {setup.teams.length} active teams are in the project.</p>
      <form action={updateTeamsAction} aria-label="Teams in the project">
        <input type="hidden" name="projectId" value={project.id} />
        <table className="members editable">
          <caption>Teams</caption>
          <thead><tr><th>Include</th><th>ID</th><th className="team-name">Team Name</th><th>Parent Team Name</th><th>Grandparent Team Name</th><th>Members now</th></tr></thead>
          {groupByValueStream(setup.teams).map(([stream, rows]) => (
            <tbody key={stream}>
              <tr className="group"><th colSpan={6} scope="rowgroup">{stream}</th></tr>
              {rows.map((x) => (
                <tr key={x.id} className={x.included ? "" : "muted"}>
                  <td>
                    <input type="hidden" name="teamId" value={x.id} />
                    <input type="checkbox" name="included" value={x.id} defaultChecked={x.included} aria-label={`Include ${x.id}`} />
                  </td>
                  <td>{x.id}</td>
                  <td className="team-name">{x.name}</td>
                  <td>{x.parentTeamName}</td>
                  <td>{x.grandparentTeamName}</td>
                  <td>{x.members}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
        <button type="submit">Update teams</button>
      </form>
    </>
  );
}
