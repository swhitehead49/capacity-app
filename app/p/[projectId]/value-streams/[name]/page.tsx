import Link from "next/link";
import { notFound } from "next/navigation";
import { getValueStreamTeams } from "@/src/application/projectValueStreams";
import { today } from "@/src/infrastructure/db/appDb";
import { projectDb } from "@/app/lib/project";

export const dynamic = "force-dynamic";

/** One of the project's value streams and its teams (sean, 15 Nov 2026). The Admin sets each team's value stream (master team list). */
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
      <p className="muted">A value stream in {project.name}. Every team in it is part of the project. A team&apos;s value stream is set by the Admin in the master team list (Reference data → Teams).</p>

      <table className="members narrow">
        <caption>Teams in {name}</caption>
        <thead><tr><th>ID</th><th>Name</th><th>Members now</th></tr></thead>
        <tbody>
          {view.teams.length === 0 && <tr><td colSpan={3} className="empty">No teams in this value stream yet.</td></tr>}
          {view.teams.map((x) => (
            <tr key={x.id}>
              <td>{x.id}</td>
              <td><Link href={`/p/${project.id}/teams/${x.id}`}>{x.name}</Link></td>
              <td>{x.members}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </>
  );
}

function safeDecode(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}
