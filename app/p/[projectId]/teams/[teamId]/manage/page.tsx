import Link from "next/link";
import { notFound } from "next/navigation";
import { listTeams } from "@/src/application/lookups";
import { getTeamDetails } from "@/src/application/teams";
import { today } from "@/src/infrastructure/db/appDb";
import { projectDb, projectReference } from "@/app/lib/project";
import { formatDate } from "@/app/lib/format";
import { BaseLocationForm, DetailsForm, RenameForm, RetireForm, ValueStreamForm } from "../../TeamForms";

export const dynamic = "force-dynamic";

/** UC16 rename and UC17 retire. Name history and successors are shown for reference. */
export default async function ManageTeam({ params }: { params: Promise<{ projectId: string; teamId: string }> }) {
  const { projectId, teamId } = await params;
  const db = (await projectDb(projectId)).db;
  const details = await getTeamDetails(db, { teamId, today: today() }).catch(() => null);
  if (!details) notFound();
  const { team, status, names, successors } = details;
  const otherTeams = (await listTeams(db)).filter((x) => x.value !== team.id);
  const reference = await projectReference(db);

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
      <p className="muted">The team&apos;s attributes from the original Teams spreadsheet. The ID stays Provisional until it is confirmed with the group leads.</p>
      <DetailsForm teamId={team.id} values={{
        leadEmail: team.leadEmail ?? "", parentTeamName: team.parentTeamName ?? "", parentTeamLeadEmail: team.parentTeamLeadEmail ?? "",
        grandparentTeamName: team.grandparentTeamName ?? "", grandparentTeamLeadEmail: team.grandparentTeamLeadEmail ?? "",
        topLevelGroup: team.topLevelGroup ?? "", topLevelLeadEmail: team.topLevelLeadEmail ?? "",
        sourceHeadcount: team.sourceHeadcount === null ? "" : String(team.sourceHeadcount), idStatus: team.idStatus, dataQualityFlag: team.dataQualityFlag ?? "",
      }} />

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
      <p className="muted">The value stream this team belongs to, from the <Link href="/reference">reference data</Link>. Its name must be unique within the value stream.</p>
      <ValueStreamForm teamId={team.id} current={team.valueStream ?? ""} valueStreams={reference.valueStreams} />

      <h2>Base location</h2>
      <p className="muted">Where the team is based. Each member keeps their own location, which decides their public holidays.</p>
      <BaseLocationForm teamId={team.id} current={team.baseLocation ?? ""} locations={reference.locations} />

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
