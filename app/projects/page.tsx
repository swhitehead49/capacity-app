import Link from "next/link";
import { getDb } from "@/src/infrastructure/db/appDb";
import { listProjects } from "@/src/infrastructure/db/projectDatabases";

export const dynamic = "force-dynamic";

/** The first thing a user does: choose their project. Each project has its own teams, people and holidays. */
export default async function ChooseProject() {
  const projects = (await listProjects(await getDb())).filter((p) => p.archivedAt === null);
  return (
    <>
      <header className="topbar" role="banner"><a href="/projects">Capacity App</a></header>
      <main>
        <h1>Choose your project</h1>
        <p className="muted">Each project has its own value streams, teams, people, holidays and plan. You can switch later from the top bar.</p>
        <ul className="project-list">
          {projects.map((p) => (
            <li key={p.id}><Link href={`/p/${p.id}`}><strong>{p.name}</strong><span className="muted">{p.id}</span></Link></li>
          ))}
        </ul>
      </main>
    </>
  );
}
