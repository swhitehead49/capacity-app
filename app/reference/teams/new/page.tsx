import Link from "next/link";
import { getReferenceData } from "@/src/application/referenceData";
import { listBaseCountries } from "@/src/application/lookups";
import { today } from "@/src/infrastructure/db/appDb";
import { sharedDb } from "@/app/lib/project";
import { AddTeamForm } from "../TeamForms";

export const dynamic = "force-dynamic";

/** UC15: add a team to the master team list (sean, 15 Nov 2026). */
export default async function NewTeam() {
  const shared = await sharedDb();
  const { valueStreams } = await getReferenceData(shared);
  return (
    <>
      <p className="muted"><Link href="/reference/teams">← Teams</Link></p>
      <h2>Add a team</h2>
      <p className="muted">The ID is permanent and can never be reused. The team joins every project that has its value stream.
        In each project it starts with that project&apos;s standard allocation (or the system one) from its start date.</p>
      <AddTeamForm today={today()} valueStreams={valueStreams} locations={await listBaseCountries(shared)} />
    </>
  );
}
