import Link from "next/link";
import { getProjectMakeup } from "@/src/application/projectValueStreams";
import { today } from "@/src/infrastructure/db/appDb";
import { projectDb } from "@/app/lib/project";

export const dynamic = "force-dynamic";

/** The project's home page (sean, 15 Nov 2026): its makeup. Read-only since 22 Nov 2026 (FR-18s): the Admin sets up
 *  which value streams and teams are in a project, in Reference data → Projects. More will be designed later. */
export default async function ProjectHome({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project, db } = await projectDb(projectId);
  const makeup = await getProjectMakeup(db, today());
  const streamLink = (name: string) => `/p/${project.id}/value-streams/${encodeURIComponent(name)}`;
  return (
    <>
      <h1>{project.name}</h1>
      <p className="muted">The project&apos;s makeup: its value streams and the teams in them. The Admin sets this up in Reference data → Projects.</p>

      <h2>Value streams</h2>
      {makeup.error ? (
        <div role="alert" className="errors"><p>{makeup.error}</p></div>
      ) : (
        <table className="members narrow">
          <caption>Value streams in this project</caption>
          <thead><tr><th>Value stream</th><th>Active teams</th><th>Members now</th></tr></thead>
          <tbody>
            {makeup.valueStreams.map((v) => (
              <tr key={v.name}>
                <td><Link href={streamLink(v.name)}>{v.name}</Link></td>
                <td>{v.teams}</td>
                <td>{v.members}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Other teams in this project</h2>
      <p className="muted">Teams the Admin added on their own: without a value stream, or from a value stream the project doesn&apos;t have.</p>
      <table className="members narrow">
        <caption>Other teams in this project</caption>
        <thead><tr><th>ID</th><th>Name</th><th>Value stream</th><th>Members now</th></tr></thead>
        <tbody>
          {makeup.otherTeams.length === 0 && <tr><td colSpan={4} className="empty">None.</td></tr>}
          {makeup.otherTeams.map((x) => (
            <tr key={x.id}>
              <td>{x.id}</td>
              <td>{x.name}</td>
              <td>{x.valueStream ?? ""}</td>
              <td>{x.members}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p><Link className="button" href={`/p/${project.id}/teams?choose=1`}>Team planning</Link></p>
    </>
  );
}
