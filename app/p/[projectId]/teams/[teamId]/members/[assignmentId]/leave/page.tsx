import Link from "next/link";
import { notFound } from "next/navigation";
import { listLeave } from "@/src/application/leave";
import { getMember } from "@/src/application/teamMembers";
import { projectDb } from "@/app/lib/project";
import { formatDate } from "@/app/lib/format";
import { cancelLeaveAction } from "./actions";
import { LeaveForm } from "./LeaveForm";

export const dynamic = "force-dynamic";

/** UC09 / FR-07: a person's own leave. Public holidays come from the shared country calendars instead. */
export default async function MemberLeave({ params }: { params: Promise<{ projectId: string; teamId: string; assignmentId: string }> }) {
  const { projectId, teamId, assignmentId } = await params;
  const db = (await projectDb(projectId)).db;
  const member = await getMember(db, Number(assignmentId));
  if (!member || member.teamId !== teamId) notFound();
  const leave = await listLeave(db, member.email);

  return (
    <>
      <p className="muted"><Link href={`/p/${projectId}/teams/${teamId}/members`}>← Team members</Link></p>
      <h1>Leave · {member.email}</h1>
      <p className="muted">
        Their own leave, such as annual or sick leave. Public holidays are not entered here: they come from the country
        calendars. For each sprint the planner takes off whichever is larger, the booked leave or the usual availability
        forecast for their location.
      </p>

      <h2>Book leave</h2>
      <LeaveForm teamId={teamId} assignmentId={assignmentId} />

      <table className="members">
        <caption>Leave</caption>
        <thead><tr><th>From</th><th>To</th><th>Type</th><th>Days</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {leave.length === 0 && <tr><td colSpan={6} className="empty">No leave booked.</td></tr>}
          {leave.map((l) => (
            <tr key={l.id} className={l.status === "Cancelled" ? "muted" : ""}>
              <td>{formatDate(l.startDate)}</td>
              <td>{formatDate(l.endDate)}</td>
              <td>{l.type}</td>
              <td>{l.dayFraction === 1 ? "Full" : "Half"}</td>
              <td>{l.status}</td>
              <td>
                {l.status === "Booked" && (
                  <form action={cancelLeaveAction}>
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="teamId" value={teamId} />
                    <input type="hidden" name="assignmentId" value={assignmentId} />
                    <input type="hidden" name="leaveId" value={l.id} />
                    <button type="submit" className="secondary">Cancel leave</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
