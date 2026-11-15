import Link from "next/link";
import { today } from "@/src/infrastructure/db/appDb";
import { projectDb, projectReference } from "@/app/lib/project";
import { AddTeamForm } from "../TeamForms";

/** UC15: add a team. It starts with the project's standard allocation, or a Draft default if there is none (BR-17). */
export const dynamic = "force-dynamic";

export default async function NewTeam({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const db = (await projectDb(projectId)).db;
  return (
    <>
      <p className="muted"><Link href={`/p/${projectId}/teams`}>← Teams</Link></p>
      <h1>Add a team</h1>
      <p className="muted">The ID is permanent and can never be reused. The team starts with the project&apos;s{" "}
        <Link href={`/p/${projectId}/settings`}>standard allocation</Link> as its default, from its start date.
        If the project has none yet, it starts with a Draft default and the planner shows calendar capacity only.</p>
      <p className="muted">Value streams and locations come from the <Link href="/reference">reference data</Link> shared by every project.</p>
      <AddTeamForm today={today()} {...await projectReference(db)} />
    </>
  );
}
