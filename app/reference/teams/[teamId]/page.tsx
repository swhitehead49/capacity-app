import Link from "next/link";
import { notFound } from "next/navigation";
import { listLocations } from "@/src/application/lookups";
import { getReferenceData } from "@/src/application/referenceData";
import { getTeamDetails } from "@/src/application/teams";
import { today } from "@/src/infrastructure/db/appDb";
import { sharedDb } from "@/app/lib/project";
import { formatDate } from "@/app/lib/format";
import { BaseLocationForm, DetailsForm, RenameForm, ValueStreamForm } from "../TeamForms";

export const dynamic = "force-dynamic";

/** One team in the master team list (sean, 15 Nov 2026): its details, name, value stream and base location. */
export default async function EditMasterTeam({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId: raw } = await params;
  const shared = await sharedDb();
  const details = await getTeamDetails(shared, { teamId: decodeURIComponent(raw), today: today() }).catch(() => null);
  if (!details) notFound();
  const { team, names } = details;
  const { valueStreams } = await getReferenceData(shared);

  return (
    <>
      <p className="muted"><Link href="/reference/teams">← Teams</Link></p>
      <h2>{team.name}</h2>
      <p className="muted">
        {team.id} · {team.valueStream ?? "no value stream"} · {team.baseLocation ? `Based in ${team.baseLocation}` : "no base location"}
      </p>
      <p className="muted">Changes here reach every project. A project gets them the next time one of its pages is opened.</p>

      <h3>Details</h3>
      <p className="muted">The team&apos;s attributes from the original Teams spreadsheet. The ID stays Provisional until it is confirmed with the group leads.</p>
      <DetailsForm teamId={team.id} values={{
        leadEmail: team.leadEmail ?? "", parentTeamName: team.parentTeamName ?? "", parentTeamLeadEmail: team.parentTeamLeadEmail ?? "",
        grandparentTeamName: team.grandparentTeamName ?? "", grandparentTeamLeadEmail: team.grandparentTeamLeadEmail ?? "",
        topLevelGroup: team.topLevelGroup ?? "", topLevelLeadEmail: team.topLevelLeadEmail ?? "",
        sourceHeadcount: team.sourceHeadcount === null ? "" : String(team.sourceHeadcount), idStatus: team.idStatus, dataQualityFlag: team.dataQualityFlag ?? "",
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
      <BaseLocationForm teamId={team.id} current={team.baseLocation ?? ""} locations={await listLocations(shared)} />
    </>
  );
}
