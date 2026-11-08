import Link from "next/link";
import { notFound } from "next/navigation";
import { listLocations, listTeams } from "../../../../../src/application/lookups";
import { getMember } from "../../../../../src/application/teamMembers";
import { getDb } from "../../../../../src/infrastructure/db/appDb";
import { formatDate, percent } from "../../../../lib/format";
import { EditMemberForm, EndMemberForm, MoveMemberForm } from "../MemberForms";

export const dynamic = "force-dynamic";

/** UC07: edit a member, end their membership, or move them to another team. All changes are logged. */
export default async function EditMember({ params }: { params: Promise<{ teamId: string; assignmentId: string }> }) {
  const { teamId, assignmentId } = await params;
  const db = await getDb();
  const member = await getMember(db, Number(assignmentId));
  if (!member || member.teamId !== teamId) notFound();
  const teams = (await listTeams(db)).filter((team) => team.value !== teamId);
  const values = {
    teamAllocation: percent(member.teamAllocation),
    sharedResource: member.sharedResource ? "on" : "",
    locationCode: member.locationCode ?? "",
    contractedHours: member.contractedHours === null ? "" : String(member.contractedHours),
    role: member.role ?? "",
    employmentStart: member.employmentStart ?? "",
    employmentEnd: member.employmentEnd ?? "",
  };

  return (
    <>
      <p className="muted"><Link href={`/teams/${teamId}/members`}>← Team members</Link></p>
      <h1>{member.email}</h1>
      <p className="muted">
        On {teamId} {member.startDate ? `from ${formatDate(member.startDate)}` : "(no start date)"}
        {member.endDate ? ` to ${formatDate(member.endDate)}` : ""} · inputs: {member.inputStatus}
      </p>

      <h2>Details</h2>
      <EditMemberForm teamId={teamId} assignmentId={assignmentId} values={values} locations={await listLocations(db)} />

      <h2>End membership</h2>
      <p className="muted">They stop counting for this team after this day. Nothing is deleted.</p>
      <EndMemberForm teamId={teamId} assignmentId={assignmentId} />

      <h2>Move to another team</h2>
      <p className="muted">They leave this team the day before and count for the new team from this day.</p>
      <MoveMemberForm teamId={teamId} assignmentId={assignmentId} teams={teams} />
    </>
  );
}
