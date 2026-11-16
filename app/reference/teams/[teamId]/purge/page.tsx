import Link from "next/link";
import { notFound } from "next/navigation";
import { purgePreview } from "@/src/application/masterTeams";
import { getTeamDetails } from "@/src/application/teams";
import { today } from "@/src/infrastructure/db/appDb";
import { sharedDb } from "@/app/lib/project";
import { allProjectDbs } from "../../projectDbs";
import { PurgeTeamForm } from "../../MasterTable";

export const dynamic = "force-dynamic";

/** Shows everything a full delete would remove, and asks for the team ID to be typed (sean, 16 Nov 2026). */
export default async function ConfirmPurgeTeam({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId: raw } = await params;
  const shared = await sharedDb();
  const details = await getTeamDetails(shared, { teamId: decodeURIComponent(raw), today: today() }).catch(() => null);
  if (!details) notFound();
  const { team } = details;
  const preview = await purgePreview(shared, await allProjectDbs(), team.id);
  return (
    <>
      <p className="muted"><Link href={`/reference/teams/${encodeURIComponent(team.id)}`}>← {team.name}</Link></p>
      <h2>Delete {team.id} {team.name} and all its data?</h2>
      <p>This removes the team from the master list and every project, together with its members&apos; time on it, the people who
        are on no other team (and their leave), its defaults and overrides, its names and its successor links.
        It can&apos;t be undone. Past sprints and quarters will no longer include it.</p>
      <table className="members narrow">
        <caption>What will be deleted</caption>
        <thead><tr><th>Project</th><th>Memberships</th><th>People (only on this team)</th><th>Defaults and overrides</th></tr></thead>
        <tbody>
          {preview.map((p) => (
            <tr key={p.project}><td>{p.project}</td><td>{p.memberships}</td><td>{p.people}</td><td>{p.settings}</td></tr>
          ))}
        </tbody>
      </table>
      <PurgeTeamForm teamId={team.id} />
      <p><Link href={`/reference/teams/${encodeURIComponent(team.id)}`}>Cancel, keep the team</Link></p>
    </>
  );
}
