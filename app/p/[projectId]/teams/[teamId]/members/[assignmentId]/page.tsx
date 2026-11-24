import Link from "next/link";
import { notFound } from "next/navigation";
import { listTeams } from "@/src/application/lookups";
import { getMember } from "@/src/application/teamMembers";
import { projectDb, projectReference } from "@/app/lib/project";
import { formatDate, percent } from "@/app/lib/format";
import { EditMemberForm, EndMemberForm, MoveMemberForm } from "../MemberForms";

export const dynamic = "force-dynamic";

/** UC07: edit a member, end their membership, or move them to another team. All changes are logged. */
export default async function EditMember({ params }: { params: Promise<{ projectId: string; teamId: string; assignmentId: string }> }) {
  const { projectId, teamId, assignmentId } = await params;
  const db = (await projectDb(projectId)).db;
  const member = await getMember(db, Number(assignmentId));
  if (!member || member.teamId !== teamId) notFound();
  const teams = (await listTeams(db)).filter((team) => team.value !== teamId);
  const values = {
    firstName: member.firstName ?? "",
    lastName: member.lastName ?? "",
    teamAllocation: percent(member.teamAllocation),
    sharedResource: member.sharedResource ? "on" : "",
    locationCode: member.locationCode ?? "",
    contractedHours: member.contractedHours === null ? "" : String(member.contractedHours),
    role: member.role ?? "",
    email: member.shownEmail ?? "",
    employmentStart: member.employmentStart ?? "",
    employmentEnd: member.employmentEnd ?? "",
  };

  return (
    <>
      <p className="muted"><Link href={`/p/${projectId}/teams/${teamId}/members`}>← Team members</Link></p>
      <h2>{member.label}</h2>
      <p className="muted">
        On {teamId} {member.startDate ? `from ${formatDate(member.startDate)}` : "(no start date)"}
        {member.endDate ? ` to ${formatDate(member.endDate)}` : ""} · inputs: {member.inputStatus} ·{" "}
        <Link href={`/p/${projectId}/teams/${teamId}/members/${assignmentId}/leave`}>Leave</Link>
      </p>

      <h3>Details</h3>
      <EditMemberForm teamId={teamId} assignmentId={assignmentId} values={values} locations={(await projectReference(db)).locations} />

      <h3>End membership</h3>
      <p className="muted">They stop counting for this team after this day. Nothing is deleted.</p>
      <EndMemberForm teamId={teamId} assignmentId={assignmentId} />

      <h3>Move to another team</h3>
      <p className="muted">They leave this team the day before and count for the new team from this day.</p>
      <MoveMemberForm teamId={teamId} assignmentId={assignmentId} teams={teams} />
    </>
  );
}
