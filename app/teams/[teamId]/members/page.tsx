import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeamMembers, type MemberRow } from "../../../../src/application/teamMembers";
import { getDb, today } from "../../../../src/infrastructure/db/appDb";
import { formatDate, percent } from "../../../lib/format";

export const dynamic = "force-dynamic";

/** UC06: who is on the team, with what they bring, and whether their inputs are complete (FR-04). */
export default async function TeamMembers({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const members = await getTeamMembers(await getDb(), { teamId, today: today() }).catch(() => null);
  if (!members) notFound();
  const { team, current, past } = members;

  return (
    <>
      <p className="muted"><Link href={`/teams/${team.id}`}>← {team.name} planner</Link></p>
      <h1>{team.name} members</h1>
      <p className="muted">{team.id} · {current.length} current, as of {formatDate(today())}</p>
      <p><Link className="button" href={`/teams/${team.id}/members/new`}>Add member</Link></p>
      <MemberTable caption="Current members" rows={current} teamId={team.id} />
      {past.length > 0 && <MemberTable caption="Past members" rows={past} teamId={team.id} />}
    </>
  );
}

function MemberTable({ caption, rows, teamId }: { caption: string; rows: MemberRow[]; teamId: string }) {
  return (
    <table className="members">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th>Email</th><th>Role</th><th>Location</th><th>Hours</th><th>Team %</th><th>Shared</th>
          <th>From</th><th>To</th><th>Inputs</th><th></th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={10} className="empty">Nobody yet.</td></tr>}
        {rows.map((m) => (
          <tr key={m.assignmentId}>
            <td>{m.email}</td>
            <td>{m.role}</td>
            <td>{m.locationCode}</td>
            <td>{m.contractedHours}</td>
            <td>{percent(m.teamAllocation)}</td>
            <td>{m.sharedResource ? "Shared" : ""}</td>
            <td>{formatDate(m.startDate)}</td>
            <td>{formatDate(m.endDate)}</td>
            <td className={m.inputStatus === "Complete" ? "" : "status-Provisional"}>{m.inputStatus}</td>
            <td><Link className="edit" href={`/teams/${teamId}/members/${m.assignmentId}`}>Edit</Link></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
