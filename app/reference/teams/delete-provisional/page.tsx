import Link from "next/link";
import { eq } from "drizzle-orm";
import * as t from "@/src/infrastructure/db/schema";
import { sharedDb } from "@/app/lib/project";
import { DeleteProvisionalTeamsForm } from "../MasterTable";

export const dynamic = "force-dynamic";

/** FR-18q (sean, 22 Nov 2026): asks before every unused Provisional team is deleted. */
export default async function ConfirmDeleteProvisional() {
  const teams = await (await sharedDb()).select({ id: t.teams.id }).from(t.teams).where(eq(t.teams.idStatus, "Provisional"));
  return (
    <>
      <p className="muted"><Link href="/reference/teams">← Teams</Link></p>
      <h2>Delete all provisional teams?</h2>
      {teams.length === 0 ? <p>There are no provisional teams.</p> : (
        <>
          <p>This deletes the {teams.length} teams whose ID status is Provisional from the master list and every project. It can&apos;t be undone.
            Confirmed teams stay. A provisional team a project already uses (members, leave or allocation changes) is kept and listed afterwards.</p>
          <DeleteProvisionalTeamsForm count={teams.length} />
        </>
      )}
      <p><Link href="/reference/teams">Cancel, keep the teams</Link></p>
    </>
  );
}
