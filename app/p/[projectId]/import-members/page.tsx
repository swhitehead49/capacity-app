import Link from "next/link";
import { importMembersAction } from "./actions";

export const dynamic = "force-dynamic";

/** FR-05b (sean, 22 Nov 2026): import team members from the template's Team Members sheet saved as CSV. */
export default async function ImportMembers({ params, searchParams }: {
  params: Promise<{ projectId: string }>; searchParams: Promise<{ error?: string; imported?: string }>;
}) {
  const { projectId } = await params;
  const { error, imported } = await searchParams;
  return (
    <>
      <p className="muted"><Link href={`/p/${projectId}/teams?choose=1`}>← Team planning</Link></p>
      <h2>Import team members</h2>
      <p className="muted">
        Use the Team Members sheet of the team template. In Excel, open that sheet and save it as CSV (File → Save As → CSV UTF-8).
        {" "}<code>Team_ID</code> is needed, and an <code>Email</code> or a name (<code>First_Name</code>, <code>Last_Name</code>): without an
        {" "}email, someone with the same name is the same person. <code>Role</code>,
        {" "}<code>Country</code> (such as DE; blank means the team&apos;s base location; a region such as DE-BY counts as its country), <code>Contracted_Hours</code>, <code>Team_Pct</code> (blank means 100),
        {" "}<code>Shared_Resource</code> (Yes or No), <code>Start_Date</code> (blank means today), <code>End_Date</code>,
        {" "}<code>Employment_Start</code> and <code>Employment_End</code> are optional. Dates as 2026-12-01 or 01/12/2026.
        Each team must be one of this project&apos;s teams. Someone already in the project keeps their details and joins the team.
        If any line has a problem, nothing is imported and every problem is listed.
      </p>
      {imported && <p role="status" className="notice">Imported {imported} team member{imported === "1" ? "" : "s"}.</p>}
      {error && (
        <div role="alert" aria-label="Problems importing" className="errors">
          {error.split("\n").map((line) => <p key={line}>{line}</p>)}
        </div>
      )}
      <form action={importMembersAction} aria-label="Import team members" className="upload">
        <input type="hidden" name="projectId" value={projectId} />
        <label>CSV file<input name="file" type="file" accept=".csv,text/csv" required /></label>
        <button type="submit">Import</button>
      </form>
    </>
  );
}
