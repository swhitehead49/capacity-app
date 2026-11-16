import Link from "next/link";
import { getProjectMakeup } from "@/src/application/projectValueStreams";
import { today } from "@/src/infrastructure/db/appDb";
import { projectDb, sharedDb } from "@/app/lib/project";
import { setIncludedAction, unlinkValueStreamAction } from "./makeupActions";
import { LinkValueStreamForm } from "./MakeupForms";

export const dynamic = "force-dynamic";

/** The project's home page (sean, 15 Nov 2026): its makeup. See and change its value streams, map teams to them,
 *  and include or exclude the teams without one. More will be designed later. */
export default async function ProjectHome({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project, db } = await projectDb(projectId);
  const makeup = await getProjectMakeup(db, today(), await sharedDb());
  const streamLink = (name: string) => `/p/${project.id}/value-streams/${encodeURIComponent(name)}`;
  return (
    <>
      <h1>{project.name}</h1>
      <p className="muted">The project&apos;s makeup: its value streams and the teams in them. More will be added to this page later.</p>

      <h2>Value streams</h2>
      {makeup.error ? (
        <div role="alert" className="errors"><p>{makeup.error}</p></div>
      ) : (
        <table className="members narrow">
          <caption>Value streams in this project</caption>
          <thead><tr><th>Value stream</th><th>Active teams</th><th>Members now</th><th></th></tr></thead>
          <tbody>
            {makeup.valueStreams.map((v) => (
              <tr key={v.name}>
                <td><Link href={streamLink(v.name)}>{v.name}</Link></td>
                <td>{v.teams}</td>
                <td>{v.members}</td>
                <td>
                  <form action={unlinkValueStreamAction}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="valueStream" value={v.name} />
                    <button type="submit" className="secondary">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted">Every team in these value streams is part of the project. Open one to see its teams. Removing a value stream takes its teams out of this project; they stay in the master team list. Which value stream a team is in is set by the Admin in Reference data → Teams.</p>
      {makeup.canAdd.length > 0
        ? <LinkValueStreamForm choices={makeup.canAdd} />
        : <p className="muted">Every value stream in the reference data is already in this project.</p>}

      <h2>Teams without a value stream</h2>
      <p className="muted">These don&apos;t have to be in a value stream. Choose whether each is part of the project: an excluded team stays
        here, greyed out, and is left out of the project.</p>
      <table className="members narrow">
        <caption>Teams without a value stream</caption>
        <thead><tr><th>ID</th><th>Name</th><th>Members now</th><th>In the project</th><th></th></tr></thead>
        <tbody>
          {makeup.unmapped.length === 0 && <tr><td colSpan={5} className="empty">Every active team is in a value stream.</td></tr>}
          {makeup.unmapped.map((x) => (
            <tr key={x.id} className={x.included ? "" : "muted"}>
              <td>{x.id}</td>
              <td>{x.name}</td>
              <td>{x.members}</td>
              <td>{x.included ? "Included" : "Excluded"}</td>
              <td>
                <form action={setIncludedAction}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="teamId" value={x.id} />
                  <input type="hidden" name="included" value={String(!x.included)} />
                  <button type="submit" className="secondary">{x.included ? "Exclude" : "Include"}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p><Link className="button" href={`/p/${project.id}/teams?choose=1`}>Team planning</Link></p>
    </>
  );
}
