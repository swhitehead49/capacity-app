import Link from "next/link";
import { projectDb } from "@/app/lib/project";

/** The project's home page (sean, 15 Nov 2026: to be designed later). For now it points to the project's teams. */
export default async function ProjectHome({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project } = await projectDb(projectId);
  return (
    <>
      <h1>{project.name}</h1>
      <p className="muted">This is the project&apos;s home page. What it shows will be designed later.</p>
      <p><Link className="button" href={`/p/${project.id}/teams`}>Teams</Link></p>
    </>
  );
}
