import Link from "next/link";
import { listTeamsOverview } from "@/src/application/teams";
import { projectMakeup } from "@/src/domain/organisation/projectMakeup";
import { today } from "@/src/infrastructure/db/appDb";
import { projectDb } from "@/app/lib/project";

export const dynamic = "force-dynamic";

/** The project's home page (sean, 15 Nov 2026): its makeup, starting with the value streams in it. More to be designed. */
export default async function ProjectHome({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project, db } = await projectDb(projectId);
  const makeup = projectMakeup(await listTeamsOverview(db, today()));
  const teamsLink = (valueStream: string) => `/p/${project.id}/teams?${new URLSearchParams({ valueStream })}`;
  return (
    <>
      <h1>{project.name}</h1>
      <p className="muted">The project&apos;s makeup. More will be added to this page later.</p>

      <h2>Value streams</h2>
      {makeup.error ? (
        <div role="alert" className="errors"><p>{makeup.error}</p></div>
      ) : (
        <table className="members narrow">
          <caption>Value streams in this project</caption>
          <thead><tr><th>Value stream</th><th>Active teams</th><th>Members now</th></tr></thead>
          <tbody>
            {makeup.valueStreams.map((v) => (
              <tr key={v.name}><td><Link href={teamsLink(v.name)}>{v.name}</Link></td><td>{v.teams}</td><td>{v.members}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted">
        A value stream is in the project when at least one of its active teams is.
        {makeup.teamsWithoutValueStream > 0 && ` ${makeup.teamsWithoutValueStream} active team${makeup.teamsWithoutValueStream === 1 ? " has" : "s have"} no value stream yet: set it on the team's Manage page.`}
      </p>
      <p><Link className="button" href={`/p/${project.id}/teams`}>Teams</Link></p>
    </>
  );
}
