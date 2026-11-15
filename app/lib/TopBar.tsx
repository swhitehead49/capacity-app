import { cookies } from "next/headers";
import { getDb } from "@/src/infrastructure/db/appDb";
import { findProject } from "@/src/infrastructure/db/projectDatabases";
import { PROJECT_COOKIE } from "./rememberedProject";

/**
 * The one top bar every page uses, so the menu is always the same (sean, 15 Nov 2026):
 * Capacity App · project · Teams, Holidays, Settings, Reference data · Switch project.
 * Outside a project (the project list, reference data) it uses the project you were in last.
 */
export async function TopBar({ projectId }: { projectId?: string }) {
  const id = projectId ?? (await cookies()).get(PROJECT_COOKIE)?.value;
  const project = id ? await findProject(await getDb(), id) : null;
  const open = project && (projectId || project.archivedAt === null) ? project : null;
  const base = open ? `/p/${open.id}` : null;
  return (
    <header className="topbar" role="banner">
      <a href={base ?? "/projects"}>Capacity App</a>
      {open && <span className="project" aria-label="Project">{open.name}</span>}
      <nav>
        {base && <><a href={`${base}/teams`}>Teams</a><a href={`${base}/holidays`}>Holidays</a><a href={`${base}/settings`}>Settings</a></>}
        <a href="/reference">Reference data</a>
      </nav>
      <a className="switch" href="/projects">{open ? "Switch project" : "Choose project"}</a>
    </header>
  );
}
