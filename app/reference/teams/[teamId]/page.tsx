import Link from "next/link";
import { notFound } from "next/navigation";
import { getReferenceData } from "@/src/application/referenceData";
import { getTeamDetails } from "@/src/application/teams";
import { today } from "@/src/infrastructure/db/appDb";
import { sharedDb } from "@/app/lib/project";
import { formatDate } from "@/app/lib/format";
import { BaseLocationForm, DetailsForm, RenameForm, RetireForm, ValueStreamForm } from "../TeamForms";
import { listBaseCountries, listTeams } from "@/src/application/lookups";

export const dynamic = "force-dynamic";

/** One team in the master team list (sean, 15 Nov 2026): its details, name, value stream and base location. */
export default async function EditMasterTeam({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { teamId: raw } = await params;
  const { saved } = await searchParams;
  const shared = await sharedDb();
  const details = await getTeamDetails(shared, { teamId: decodeURIComponent(raw), today: today() }).catch(() => null);
  if (!details) notFound();
  const { team, names, status, successors } = details;
  const otherTeams = (await listTeams(shared)).filter((x) => x.value !== team.id);
  const { valueStreams } = await getReferenceData(shared);

  return (
    <>
      <p className="muted"><Link href="/reference/teams">← Teams</Link></p>
      <h2>{team.name}</h2>
      <p className="muted">
        {team.id} · {team.valueStream ?? "no value stream"} · {team.baseLocation ? `Based in ${team.baseLocation}` : "no base location"} · {status}
      </p>
      {successors.length > 0 && (
        <p>Replaced by: {successors.map((x, i) => (
          <span key={x.id}>{i > 0 && ", "}<Link href={`/reference/teams/${encodeURIComponent(x.id)}`}>{`${x.id} | ${x.name}`}</Link></span>
        ))}</p>
      )}
      {saved && <p role="status" className="notice">Saved.</p>}
      <p className="muted">Changes here reach every project. A project gets them the next time one of its pages is opened.</p>

      <h3>Details</h3>
      <p className="muted">The team&apos;s attributes from the original Teams spreadsheet. The ID stays Provisional until it is confirmed with the group leads.</p>
      <DetailsForm teamId={team.id} teamName={team.name} values={{
        leadEmail: team.leadEmail ?? "", parentTeamName: team.parentTeamName ?? "", parentTeamLeadEmail: team.parentTeamLeadEmail ?? "",
        grandparentTeamName: team.grandparentTeamName ?? "", grandparentTeamLeadEmail: team.grandparentTeamLeadEmail ?? "",
        topLevelGroup: team.topLevelGroup ?? "", topLevelLeadEmail: team.topLevelLeadEmail ?? "",
        sourceHeadcount: team.sourceHeadcount === null ? "" : String(team.sourceHeadcount), idStatus: team.idStatus, dataQualityFlag: team.dataQualityFlag ?? "",
        teamType: team.teamType ?? "",
        teamLeadFirstName: team.teamLeadFirstName ?? "", teamLeadLastName: team.teamLeadLastName ?? "",
        parentTeamLeadFirstName: team.parentTeamLeadFirstName ?? "", parentTeamLeadLastName: team.parentTeamLeadLastName ?? "",
        grandparentTeamLeadFirstName: team.grandparentTeamLeadFirstName ?? "", grandparentTeamLeadLastName: team.grandparentTeamLeadLastName ?? "",
        topLevelLeadFirstName: team.topLevelLeadFirstName ?? "", topLevelLeadLastName: team.topLevelLeadLastName ?? "",
      }} />

      <h3>Rename</h3>
      <p className="muted">The ID, members and settings stay the same. The old name is kept in the history.</p>
      <RenameForm teamId={team.id} today={today()} />
      <table className="members narrow">
        <caption>Name history</caption>
        <thead><tr><th>Name</th><th>From</th></tr></thead>
        <tbody>
          {names.map((n, i) => <tr key={i}><td>{n.name}</td><td>{n.effectiveFrom ? formatDate(n.effectiveFrom) : "the start"}</td></tr>)}
        </tbody>
      </table>

      <h3>Value stream</h3>
      <p className="muted">Decides which projects the team is in: every project that has this value stream. Its name must be unique within the value stream.</p>
      <ValueStreamForm teamId={team.id} current={team.valueStream ?? ""} valueStreams={valueStreams} />

      <h3>Base location</h3>
      <p className="muted">Where the team is based. Each member keeps their own location, which decides their public holidays.</p>
      <BaseLocationForm teamId={team.id} current={team.baseLocation ?? ""} locations={await listBaseCountries(shared)} />

      <h3>Retire</h3>
      {team.retiredOn ? (
        <p>Retired after {formatDate(team.retiredOn)} in every project. Past periods are still reported.</p>
      ) : (
        <>
          <p className="muted">Retires the team in every project at once. Everyone must first be moved or ended on or before the last
            day, in every project; anyone still on it is listed. Defaults and overrides that start after it are retired; earlier ones
            stay so past periods still report. Nothing is deleted.</p>
          <RetireForm teamId={team.id} teams={otherTeams} />
        </>
      )}

      {team.idStatus === "Provisional" && (
        <>
          <h3>Delete</h3>
          <p className="muted">While its ID is Provisional, a team can be deleted from the master list and every project, as long as no
            project has given it members, leave or allocation changes yet. Otherwise retire it in the project instead.</p>
          <p><Link className="button secondary danger" href={`/reference/teams/${encodeURIComponent(team.id)}/delete`}>Delete team</Link></p>
        </>
      )}

      <h3>Delete team and all its data</h3>
      <p className="muted">For a team that should never have existed, whatever its status: removes it and everything that belongs
        only to it, in every project. You will see what goes and be asked to type the team ID first.</p>
      <p><Link className="button secondary danger" href={`/reference/teams/${encodeURIComponent(team.id)}/purge`}>Delete team and all its data</Link></p>
    </>
  );
}
