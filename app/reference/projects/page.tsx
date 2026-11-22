import Link from "next/link";
import { getDb } from "@/src/infrastructure/db/appDb";
import { listProjects } from "@/src/infrastructure/db/projectDatabases";
import { formatDate } from "@/app/lib/format";
import { NewProjectForm } from "@/app/projects/ProjectForms";
import { archiveFromListAction, restoreFromListAction } from "./actions";

export const dynamic = "force-dynamic";

/** Reference data, Projects tab (sean, 15 Nov 2026): the Admin adds projects and, since 22 Nov 2026 (FR-18s), sets up each one. */
export default async function Projects({ searchParams }: { searchParams: Promise<{ created?: string; archived?: string; restored?: string; error?: string }> }) {
  const { created, archived, restored, error } = await searchParams;
  const projects = await listProjects(await getDb());
  return (
    <>
      <h2>Projects</h2>
      <p className="muted">Each project has its own value streams, teams, people and plan. Engineering managers choose a project,
        then rename it and set its standard allocation. Choose a project to set up which value streams and teams are in it,
        or add a new one below. Archiving hides a project from Engineering managers; nothing is deleted and it can be restored.
        Archiving Default keeps everything all projects share (the master team list, sprint calendar and reference data).</p>
      {archived && <p role="status" className="notice">Archived {archived}.</p>}
      {restored && <p role="status" className="notice">Restored {restored}.</p>}
      {error && <p role="alert" className="errors">{error}</p>}
      <table className="members narrow">
        <caption>Projects</caption>
        <thead><tr><th>Name</th><th>ID (web address)</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className={p.archivedAt ? "muted" : ""}>
              <td>{p.name}</td><td>/p/{p.id}</td>
              <td>{p.archivedAt ? `Archived ${formatDate(p.archivedAt.toISOString().slice(0, 10))}` : "Open"}</td>
              <td className="row-actions">
                <Link className="edit" href={`/reference/projects/${p.id}`} aria-label={`Set up ${p.name}`}>Set up</Link>
                <form action={p.archivedAt ? restoreFromListAction : archiveFromListAction} className="inline">
                  <input type="hidden" name="projectId" value={p.id} />
                  <button type="submit" className="secondary" aria-label={`${p.archivedAt ? "Restore" : "Archive"} ${p.name}`}>
                    {p.archivedAt ? "Restore" : "Archive"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>New project</h3>
      <p className="muted">It starts empty. Next you tick its value streams and teams.</p>
      {created && <p role="status" className="notice">Created {created}. Engineering managers can now choose it.</p>}
      <NewProjectForm />
    </>
  );
}
