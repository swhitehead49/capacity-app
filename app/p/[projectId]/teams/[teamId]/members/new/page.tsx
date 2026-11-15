import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { today } from "@/src/infrastructure/db/appDb";
import { projectDb, projectReference } from "@/app/lib/project";
import * as t from "@/src/infrastructure/db/schema";
import { AddMemberForm } from "../MemberForms";

export const dynamic = "force-dynamic";

/** UC07 / BR-21: add someone to the team from a start date. */
export default async function AddMember({ params }: { params: Promise<{ projectId: string; teamId: string }> }) {
  const { projectId, teamId } = await params;
  const db = (await projectDb(projectId)).db;
  const team = await db.query.teams.findFirst({ where: eq(t.teams.id, teamId) });
  if (!team) notFound();
  return (
    <>
      <p className="muted"><Link href={`/p/${projectId}/teams/${team.id}/members`}>← {team.name} members</Link></p>
      <h1>Add a member to {team.name}</h1>
      <AddMemberForm teamId={team.id} locations={(await projectReference(db)).locations} today={today()} baseLocation={team.baseLocation ?? ""} />
    </>
  );
}
