import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeamDetails } from "@/src/application/teams";
import { today } from "@/src/infrastructure/db/appDb";
import { sharedDb } from "@/app/lib/project";
import { DeleteTeamForm } from "../../MasterTable";

export const dynamic = "force-dynamic";

/** Asks before a team is deleted (sean, 16 Nov 2026). */
export default async function ConfirmDeleteTeam({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId: raw } = await params;
  const details = await getTeamDetails(await sharedDb(), { teamId: decodeURIComponent(raw), today: today() }).catch(() => null);
  if (!details) notFound();
  const { team } = details;
  return (
    <>
      <p className="muted"><Link href="/reference/teams">← Teams</Link></p>
      <h2>Delete {team.id} {team.name}?</h2>
      <DeleteTeamForm teamId={team.id} />
      <p><Link href="/reference/teams">Cancel, keep the team</Link></p>
    </>
  );
}
