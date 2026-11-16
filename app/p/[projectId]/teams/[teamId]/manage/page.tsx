import Link from "next/link";
import { notFound } from "next/navigation";
import { listTeams } from "@/src/application/lookups";
import { getTeamDetails } from "@/src/application/teams";
import { today } from "@/src/infrastructure/db/appDb";
import { projectDb } from "@/app/lib/project";
import { formatDate } from "@/app/lib/format";
import { RetireForm } from "../../RetireForm";

export const dynamic = "force-dynamic";

/** A team in this project: its details from the master team list (read-only here), and UC17 retire. */
export default async function ManageTeam({ params }: { params: Promise<{ projectId: string; teamId: string }> }) {
  const { projectId, teamId } = await params;
  const db = (await projectDb(projectId)).db;
  const details = await getTeamDetails(db, { teamId, today: today() }).catch(() => null);
  if (!details) notFound();
  const { team, status, names, successors } = details;
  const otherTeams = (await listTeams(db)).filter((x) => x.value !== team.id);

  return (
    <>
      <p className="muted"><Link href={`/p/${projectId}/teams`}>← Teams</Link></p>
      <h1>{team.name}</h1>
      <p className="muted">
        {team.id} · {team.valueStream ?? "no value stream"} · {team.baseLocation ? `Based in ${team.baseLocation}` : "no base location"} · {status} ·{" "}
        <Link href={`/p/${projectId}/teams/${team.id}`}>Planner</Link> · <Link href={`/p/${projectId}/teams/${team.id}/members`}>Members</Link> ·{" "}
        <Link href={`/p/${projectId}/teams/${team.id}/default`}>Default</Link>
      </p>
      {successors.length > 0 && (
        <p>Replaced by: {successors.map((s, i) => (
          <span key={s.id}>{i > 0 && ", "}<Link href={`/p/${projectId}/teams/${s.id}/manage`}>{`${s.id} | ${s.name}`}</Link></span>
        ))}</p>
      )}

      <h2>Details</h2>
      <p className="muted">From the master team list. Only an Admin can change them, in Reference data → Teams.</p>
      <dl className="details">
        <dt>Value stream</dt><dd>{team.valueStream ?? "None"}</dd>
        <dt>Base location</dt><dd>{team.baseLocation ?? "Not set"}</dd>
        <dt>Lead</dt><dd>{team.leadEmail ?? ""}</dd>
        <dt>Parent team</dt><dd>{team.parentTeamName ?? ""}</dd>
        <dt>Top-level group</dt><dd>{team.topLevelGroup ?? ""}</dd>
        <dt>Source headcount</dt><dd>{team.sourceHeadcount ?? ""}</dd>
        <dt>ID status</dt><dd>{team.idStatus}</dd>
      </dl>

      <table className="members narrow">
        <caption>Name history</caption>
        <thead><tr><th>Name</th><th>From</th></tr></thead>
        <tbody>
          {names.map((n, i) => <tr key={i}><td>{n.name}</td><td>{n.effectiveFrom ? formatDate(n.effectiveFrom) : "the start"}</td></tr>)}
        </tbody>
      </table>

      <h2>Retire</h2>
      {team.retiredOn ? (
        <p>Retired after {formatDate(team.retiredOn)}. Past periods are still reported.</p>
      ) : (
        <>
          <p className="muted">
            Everyone must be moved or ended on or before the last day first. Defaults and overrides that start after it are retired;
            earlier ones stay so past periods still report. Nothing is deleted.
          </p>
          <RetireForm teamId={team.id} teams={otherTeams} />
        </>
      )}
    </>
  );
}
