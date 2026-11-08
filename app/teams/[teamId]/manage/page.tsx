import Link from "next/link";
import { notFound } from "next/navigation";
import { listTeams } from "../../../../src/application/lookups";
import { getTeamDetails, listValueStreams } from "../../../../src/application/teams";
import { getDb, today } from "../../../../src/infrastructure/db/appDb";
import { formatDate } from "../../../lib/format";
import { RenameForm, RetireForm, ValueStreamForm } from "../../TeamForms";

export const dynamic = "force-dynamic";

/** UC16 rename and UC17 retire. Name history and successors are shown for reference. */
export default async function ManageTeam({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const db = await getDb();
  const details = await getTeamDetails(db, { teamId, today: today() }).catch(() => null);
  if (!details) notFound();
  const { team, status, names, successors } = details;
  const otherTeams = (await listTeams(db)).filter((x) => x.value !== team.id);

  return (
    <>
      <p className="muted"><Link href="/teams">← Teams</Link></p>
      <h1>{team.name}</h1>
      <p className="muted">
        {team.id} · {team.valueStream ?? "no value stream"} · {status} ·{" "}
        <Link href={`/teams/${team.id}`}>Planner</Link> · <Link href={`/teams/${team.id}/members`}>Members</Link> ·{" "}
        <Link href={`/teams/${team.id}/default`}>Default</Link>
      </p>
      {successors.length > 0 && (
        <p>Replaced by: {successors.map((s, i) => (
          <span key={s.id}>{i > 0 && ", "}<Link href={`/teams/${s.id}/manage`}>{`${s.id} | ${s.name}`}</Link></span>
        ))}</p>
      )}

      <h2>Rename</h2>
      <p className="muted">The ID, members and settings stay the same. The old name is kept in the history.</p>
      <RenameForm teamId={team.id} today={today()} />

      <table className="members narrow">
        <caption>Name history</caption>
        <thead><tr><th>Name</th><th>From</th></tr></thead>
        <tbody>
          {names.map((n, i) => <tr key={i}><td>{n.name}</td><td>{n.effectiveFrom ? formatDate(n.effectiveFrom) : "the start"}</td></tr>)}
        </tbody>
      </table>

      <h2>Value stream</h2>
      <p className="muted">The value stream this team belongs to. Its name must be unique within the value stream.</p>
      <ValueStreamForm teamId={team.id} current={team.valueStream ?? ""} valueStreams={await listValueStreams(db)} />

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
