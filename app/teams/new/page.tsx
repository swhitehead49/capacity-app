import Link from "next/link";
import { today } from "../../../src/infrastructure/db/appDb";
import { AddTeamForm } from "../TeamForms";

/** UC15: add a team. It starts with a Draft default, so the planner shows calendar capacity only (BR-17). */
export default function NewTeam() {
  return (
    <>
      <p className="muted"><Link href="/teams">← Teams</Link></p>
      <h1>Add a team</h1>
      <p className="muted">The ID is permanent and can never be reused. The team starts with a Draft default; set its default to make the planner&apos;s numbers Ready.</p>
      <AddTeamForm today={today()} />
    </>
  );
}
