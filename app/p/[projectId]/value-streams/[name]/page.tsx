import Link from "next/link";
import { notFound } from "next/navigation";
import { getValueStreamTeams } from "@/src/application/projectValueStreams";
import { today } from "@/src/infrastructure/db/appDb";
import { projectDb } from "@/app/lib/project";
import { removeTeamAction } from "../../makeupActions";
import { AddTeamsForm } from "../../MakeupForms";

export const dynamic = "force-dynamic";

/** One of the project's value streams and its teams (sean, 15 Nov 2026): remove a team, or add several at once. */
export default async function ValueStreamTeams({ params }: { params: Promise<{ projectId: string; name: string }> }) {
  const { projectId, name: raw } = await params;
  const name = safeDecode(raw);
  const { project, db } = await projectDb(projectId);
  const view = await getValueStreamTeams(db, { name, today: today() });
  if (!view.inProject) notFound();
  return (
    <>
      <p className="muted"><Link href={`/p/${project.id}`}>← {project.name}</Link></p>
      <h1>{name}</h1>
      <p className="muted">A value stream in {project.name}. Removing a team keeps it in the project, without a value stream.</p>

      <table className="members narrow">
        <caption>Teams in {name}</caption>
        <thead><tr><th>ID</th><th>Name</th><th>Members now</th><th></th></tr></thead>
        <tbody>
          {view.teams.length === 0 && <tr><td colSpan={4} className="empty">No teams yet. Add some below.</td></tr>}
          {view.teams.map((x) => (
            <tr key={x.id}>
              <td>{x.id}</td>
              <td><Link href={`/p/${project.id}/teams/${x.id}`}>{x.name}</Link></td>
              <td>{x.members}</td>
              <td>
                <form action={removeTeamAction}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="teamId" value={x.id} />
                  <input type="hidden" name="valueStream" value={name} />
                  <button type="submit" className="secondary">Remove</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Add teams</h2>
      {view.candidates.length === 0
        ? <p className="muted">Every active team is already in a value stream.</p>
        : <AddTeamsForm valueStream={name} candidates={view.candidates} />}
    </>
  );
}

function safeDecode(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}
