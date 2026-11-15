import { cookies } from "next/headers";
import { getDb } from "@/src/infrastructure/db/appDb";
import { findProject } from "@/src/infrastructure/db/projectDatabases";
import { ROLE_LABELS, parseRole } from "@/src/domain/access/roles";
import { PROJECT_COOKIE, ROLE_COOKIE } from "./rememberedProject";

/**
 * The one top bar every page uses, so the menu is always the same (sean, 15 Nov 2026):
 * Capacity App (home) · project · Teams, Project reference data (managers only), Reference data (Admins only) · role · Switch project. (Settings moved into Reference data.)
 * Outside a project (the project list, reference data) it uses the project you were in last.
 */
export async function TopBar({ projectId }: { projectId?: string }) {
  const open = projectId ? await findProject(await getDb(), projectId) : await currentProject();
  const base = open ? `/p/${open.id}` : null;
  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  return (
    <header className="topbar" role="banner">
      <a href="/" title="Home: choose who you are">Capacity App</a>
      {open && <span className="project" aria-label="Project">{open.name}</span>}
      <nav>
        {base && <a href={`${base}/teams`}>Teams</a>}
        {base && role === "manager" && <a href={`${base}/project-reference`}>Project reference data</a>}
        {role === "admin" && <a href="/reference">Reference data</a>}
      </nav>
      {role && <span className="role muted">{ROLE_LABELS[role]}</span>}
      <a className="switch" href="/projects">{open ? "Switch project" : "Choose project"}</a>
    </header>
  );
}

/** The project you were in last (remembered in a cookie), if it is still open. */
export async function currentProject() {
  const id = (await cookies()).get(PROJECT_COOKIE)?.value;
  const project = id ? await findProject(await getDb(), id) : null;
  return project && project.archivedAt === null ? project : null;
}
