import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { listLocations } from "../../../../../src/application/lookups";
import { getDb, today } from "../../../../../src/infrastructure/db/appDb";
import * as t from "../../../../../src/infrastructure/db/schema";
import { AddMemberForm } from "../MemberForms";

export const dynamic = "force-dynamic";

/** UC07 / BR-21: add someone to the team from a start date. */
export default async function AddMember({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const db = await getDb();
  const team = await db.query.teams.findFirst({ where: eq(t.teams.id, teamId) });
  if (!team) notFound();
  return (
    <>
      <p className="muted"><Link href={`/teams/${team.id}/members`}>← {team.name} members</Link></p>
      <h1>Add a member to {team.name}</h1>
      <AddMemberForm teamId={team.id} locations={await listLocations(db)} today={today()} />
    </>
  );
}
