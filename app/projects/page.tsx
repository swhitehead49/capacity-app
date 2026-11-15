import { TopBar } from "@/app/lib/TopBar";
import Link from "next/link";
import { getDb } from "@/src/infrastructure/db/appDb";
import { listProjects } from "@/src/infrastructure/db/projectDatabases";
import { formatDate } from "@/app/lib/format";
import { restoreProjectAction } from "./actions";
import { NewProjectForm } from "./ProjectForms";

export const dynamic = "force-dynamic";

/** The first thing a user does: choose their project. Each project has its own teams, people and plan. */
export default async function ChooseProject() {
  const all = await listProjects(await getDb());
  const open = all.filter((p) => p.archivedAt === null);
  const archived = all.filter((p) => p.archivedAt !== null);
  return (
    <>
      <TopBar />
      <main>
        <h1>Choose your project</h1>
        <p className="muted">Each project has its own value streams, teams, people and plan. The sprint calendar and public holidays are shared. You can switch later from the top bar.</p>
        <ul className="project-list" aria-label="Projects">
          {open.map((p) => (
            <li key={p.id}><Link href={`/p/${p.id}`}><strong>{p.name}</strong><span className="muted">{p.id}</span></Link></li>
          ))}
        </ul>

        <h2>New project</h2>
        <p className="muted">It starts empty. Add or import its teams, and set its standard allocation in Settings.</p>
        <NewProjectForm />

        {archived.length > 0 && (
          <table className="members">
            <caption>Archived projects</caption>
            <thead><tr><th>Name</th><th>Archived</th><th></th></tr></thead>
            <tbody>
              {archived.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{formatDate(p.archivedAt!.toISOString().slice(0, 10))}</td>
                  <td>
                    <form action={restoreProjectAction}>
                      <input type="hidden" name="projectId" value={p.id} />
                      <button type="submit" className="secondary">Restore</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
