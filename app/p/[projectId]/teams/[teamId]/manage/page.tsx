import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeamDetails } from "@/src/application/teams";
import { describeLead } from "@/src/domain/organisation/teamDetails";
import { today } from "@/src/infrastructure/db/appDb";
import { projectDb } from "@/app/lib/project";
import { formatDate } from "@/app/lib/format";

export const dynamic = "force-dynamic";

/** A team in this project: its details from the master team list (read-only here), and UC17 retire. */
export default async function ManageTeam({ params }: { params: Promise<{ projectId: string; teamId: string }> }) {
  const { projectId, teamId } = await params;
  const db = (await projectDb(projectId)).db;
  const details = await getTeamDetails(db, { teamId, today: today() }).catch(() => null);
  if (!details) notFound();
  const { team, status, names, successors } = details;

  return (
    <>
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
        <dt>Lead</dt><dd>{describeLead(team.teamLeadFirstName, team.teamLeadLastName, team.leadEmail)}</dd>
        <dt>Parent team</dt><dd>{team.parentTeamName ?? ""}</dd>
        <dt>Parent team lead</dt><dd>{describeLead(team.parentTeamLeadFirstName, team.parentTeamLeadLastName, team.parentTeamLeadEmail)}</dd>
        <dt>Grandparent team</dt><dd>{team.grandparentTeamName ?? ""}</dd>
        <dt>Grandparent team lead</dt><dd>{describeLead(team.grandparentTeamLeadFirstName, team.grandparentTeamLeadLastName, team.grandparentTeamLeadEmail)}</dd>
        <dt>Top-level group</dt><dd>{team.topLevelGroup ?? ""}</dd>
        <dt>Top-level lead</dt><dd>{describeLead(team.topLevelLeadFirstName, team.topLevelLeadLastName, team.topLevelLeadEmail)}</dd>
        <dt>Source headcount</dt><dd>{team.sourceHeadcount ?? ""}</dd>
        <dt>ID status</dt><dd>{team.idStatus}</dd>
        <dt>Team type</dt><dd>{team.teamType ?? "Not set"}</dd>
      </dl>

      <table className="members narrow">
        <caption>Name history</caption>
        <thead><tr><th>Name</th><th>From</th></tr></thead>
        <tbody>
          {names.map((n, i) => <tr key={i}><td>{n.name}</td><td>{n.effectiveFrom ? formatDate(n.effectiveFrom) : "the start"}</td></tr>)}
        </tbody>
      </table>

      <h2>Retire</h2>
      {team.retiredOn
        ? <p>Retired after {formatDate(team.retiredOn)}. Past periods are still reported.</p>
        : <p className="muted">An Admin retires a team in the master team list, for every project at once.
          Before that, move or end its members here on the Team members tab.</p>}
    </>
  );
}
