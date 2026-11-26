import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeamMembers, type MemberRow } from "@/src/application/teamMembers";
import { fullName } from "@/src/domain/people/memberRules";
import { today } from "@/src/infrastructure/db/appDb";
import { projectDb } from "@/app/lib/project";
import { formatDate, percent } from "@/app/lib/format";

export const dynamic = "force-dynamic";

/** UC06: who is on the team, with what they bring, and whether their inputs are complete (FR-04). */
export default async function TeamMembers({ params }: { params: Promise<{ projectId: string; teamId: string }> }) {
  const { projectId, teamId } = await params;
  const members = await getTeamMembers((await projectDb(projectId)).db, { teamId, today: today() }).catch(() => null);
  if (!members) notFound();
  const { team, current, past } = members;

  return (
    <>
      <h2>Team members</h2>
      <p className="muted">{current.length} current, as of {formatDate(today())}. Edit a member to change their details or their
        country (whose nationwide public holidays they get), end their membership or move them to another team. Nobody is deleted,
        so past sprints still add up. People with missing inputs count as zero capacity until they are filled in.</p>
      <p><Link className="button" href={`/p/${projectId}/teams/${team.id}/members/new`}>Add member</Link></p>
      <MemberTable caption="Current members" rows={current} projectId={projectId} teamId={team.id} />
      {past.length > 0 && <MemberTable caption="Past members" rows={past} projectId={projectId} teamId={team.id} />}
    </>
  );
}

function MemberTable({ caption, rows, projectId, teamId }: { caption: string; rows: MemberRow[]; projectId: string; teamId: string }) {
  return (
    <table className="members">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th>Name</th><th>Email</th><th>Role</th><th>Country</th><th>Hours</th><th>Team %</th><th>Shared</th>
          <th>From</th><th>To</th><th>Inputs</th><th></th><th></th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={12} className="empty">Nobody yet.</td></tr>}
        {rows.map((m) => (
          <tr key={m.assignmentId}>
            <td>{fullName(m)}</td>
            <td>{m.shownEmail ?? ""}</td>
            <td>{m.role}</td>
            <td>{m.locationCode}</td>
            <td>{m.contractedHours}</td>
            <td>{percent(m.teamAllocation)}</td>
            <td>{m.sharedResource ? "Shared" : ""}</td>
            <td>{formatDate(m.startDate)}</td>
            <td>{formatDate(m.endDate)}</td>
            <td className={m.inputStatus === "Complete" ? "" : "status-Provisional"}>{m.inputStatus}</td>
            <td><Link className="edit" href={`/p/${projectId}/teams/${teamId}/members/${m.assignmentId}`}>Edit</Link></td>
            <td><Link className="edit" href={`/p/${projectId}/teams/${teamId}/members/${m.assignmentId}/leave`}>Leave</Link></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
