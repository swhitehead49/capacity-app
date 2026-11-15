import { redirect } from "next/navigation";

/** Settings became Project reference data (sean, 15 Nov 2026). Old links still work. */
export default async function ProjectSettings({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/p/${projectId}/project-reference`);
}
