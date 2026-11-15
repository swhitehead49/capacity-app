import Link from "next/link";
import { projectDb } from "@/app/lib/project";
import { importTeamsAction } from "./actions";

export const dynamic = "force-dynamic";

/** Import teams from a spreadsheet saved as CSV (sean, 15 Nov 2026). */
export default async function ImportTeams({ params, searchParams }: {
  params: Promise<{ projectId: string }>; searchParams: Promise<{ error?: string }>;
}) {
  const { projectId } = await params;
  const { error } = await searchParams;
  const { project } = await projectDb(projectId);
  return (
    <>
      <p className="muted"><Link href={`/p/${projectId}/teams`}>← Teams</Link></p>
      <h1>Import teams into {project.name}</h1>
      <p className="muted">
        In Excel, save the sheet as CSV (File → Save As → CSV). The first line needs the headings
        {" "}<code>team_id,name</code>, and may also have <code>value_stream</code>, <code>lead_email</code>,
        {" "}<code>start_date</code> (2026-11-16 or 16/11/2026; blank means today) and <code>base_location</code> (a location
        {" "}code the project already has, such as DE-BY). Each team gets the same checks as Add team.
        If any line has a problem, nothing is imported and every problem is listed.
        New teams start with this project&apos;s <Link href={`/p/${projectId}/settings`}>standard allocation</Link>.
      </p>
      {error && (
        <div role="alert" aria-label="Problems importing" className="errors">
          {error.split("\n").map((line) => <p key={line}>{line}</p>)}
        </div>
      )}
      <form action={importTeamsAction} aria-label="Import teams" className="upload">
        <input type="hidden" name="projectId" value={projectId} />
        <label>CSV file<input name="file" type="file" accept=".csv,text/csv" required /></label>
        <button type="submit">Import</button>
      </form>
    </>
  );
}
