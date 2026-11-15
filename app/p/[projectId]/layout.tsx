import { TopBar } from "@/app/lib/TopBar";
import type { ReactNode } from "react";
import { projectDb } from "@/app/lib/project";

/** Every screen inside a project: the top bar names the project, and its links stay in that project. */
export default async function ProjectLayout({ children, params }: { children: ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project } = await projectDb(projectId);
  return (
    <>
      <TopBar projectId={project.id} />
      <main>{children}</main>
    </>
  );
}
