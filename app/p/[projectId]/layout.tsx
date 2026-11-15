import type { ReactNode } from "react";
import { projectDb } from "@/app/lib/project";

/** Every screen inside a project: the top bar names the project, and its links stay in that project. */
export default async function ProjectLayout({ children, params }: { children: ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project } = await projectDb(projectId);
  const base = `/p/${project.id}`;
  return (
    <>
      <header className="topbar" role="banner">
        <a href={base}>Capacity App</a>
        <span className="project" aria-label="Project">{project.name}</span>
        <nav><a href={`${base}/teams`}>Teams</a><a href={`${base}/holidays`}>Holidays</a></nav>
        <a className="switch" href="/projects">Switch project</a>
      </header>
      <main>{children}</main>
    </>
  );
}
