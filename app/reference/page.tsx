import { currentProject } from "@/app/lib/TopBar";
import { getStandardAllocation } from "@/src/application/standardAllocation";
import { getProjectDb } from "@/src/infrastructure/db/appDb";
import { DEFAULT_PROJECT } from "@/src/domain/projects/projectRules";
import { percent } from "@/app/lib/format";
import { archiveProjectAction } from "@/app/projects/actions";
import { RenameProjectForm } from "@/app/projects/ProjectForms";
import { StandardForm } from "./StandardForm";
import Link from "next/link";
import { STARTING_LOCATIONS, getReferenceData } from "@/src/application/referenceData";
import { sharedDb } from "@/app/lib/project";
import { addStartingLocationsAction } from "./actions";
import { AddLocationForm, AddValueStreamForm } from "./ReferenceForms";

export const dynamic = "force-dynamic";

/** Reference data set once for the whole system and used by every project (sean, 15 Nov 2026). */
export default async function ReferenceData({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const { valueStreams, locations } = await getReferenceData(await sharedDb());
  const project = await currentProject();
  const standard = project ? await getStandardAllocation(await getProjectDb(project.id)) : null;
  const standardValues: Record<string, string> = standard
    ? {
      overhead: percent(standard.overhead), contingency: percent(standard.contingency),
      run: percent(standard.split.run), fix: percent(standard.split.fix), sustain: percent(standard.split.sustain),
      change: percent(standard.split.change), enabling: percent(standard.split.enabling),
    }
    : {};
  const missing = STARTING_LOCATIONS.filter((s) => !locations.some((l) => l.code === s.code));
  return (
    <>
        <h1>Reference data</h1>
        <p className="muted">Settings for the project you are in, then the lists shared by every project:
          {" "}<a href="#value-streams">value streams</a>, <a href="#locations">locations</a> and <Link href="/reference/public-holidays">public holidays</Link>.</p>

        {project && (
          <section aria-label="This project">
            <h2 id="standard-allocation">{project.name}: standard allocation for new teams</h2>
            <p className="muted">
              A team added to {project.name} starts with these percentages as its team default, in force from its start date,
              so its planner is Ready straight away. You can still change any team&apos;s default afterwards.
              Changing the standard here does not change existing teams.
              {!standard && " Until it is set, a new team starts with a Draft default."}
            </p>
            {saved && <p role="status" className="notice">Saved. New teams will start with this allocation.</p>}
            <StandardForm projectId={project.id} values={standardValues} />

            <h2 id="project">{project.name}: project</h2>
            <p className="muted">Its web address stays /p/{project.id} after a rename, so links keep working.</p>
            <RenameProjectForm projectId={project.id} name={project.name} />
            {project.id !== DEFAULT_PROJECT && (
              <form action={archiveProjectAction} className="archive">
                <input type="hidden" name="projectId" value={project.id} />
                <p className="muted">Archiving hides the project from the project list. Nothing is deleted, and you can restore it there.</p>
                <button type="submit" className="secondary danger">Archive project</button>
              </form>
            )}
          </section>
        )}

        <h2 id="value-streams">Value streams (all projects)</h2>
        <p className="muted">A team&apos;s value stream is picked from this list.</p>
        <table className="members narrow">
          <caption>Value streams</caption>
          <thead><tr><th>Name</th></tr></thead>
          <tbody>
            {valueStreams.length === 0 && <tr><td className="empty">None yet.</td></tr>}
            {valueStreams.map((v) => <tr key={v}><td>{v}</td></tr>)}
          </tbody>
        </table>
        <AddValueStreamForm />

        <h2 id="locations">Locations (all projects)</h2>
        <p className="muted">A team&apos;s base location and each person&apos;s location are picked from this list. The code is the ISO region code (such as DE-BY), or the country code alone for a whole country.
          It decides which public holidays apply to the people there.</p>
        <table className="members narrow">
          <caption>Locations</caption>
          <thead><tr><th>Code</th><th>Country</th><th>Name</th><th>Standard hours</th><th></th></tr></thead>
          <tbody>
            {locations.length === 0 && <tr><td colSpan={5} className="empty">None yet.</td></tr>}
            {locations.map((l) => <tr key={l.code}><td>{l.code}</td><td>{l.country}</td><td>{l.name}</td><td>{l.standardHours ?? ""}</td><td><Link className="edit" href={`/reference/locations/${l.code}`}>Edit</Link></td></tr>)}
          </tbody>
        </table>
        {missing.length > 0 && (
          <form action={addStartingLocationsAction} className="upload">
            <p className="muted">The original workbook&apos;s locations not here yet: {missing.map((l) => l.code).join(", ")}.</p>
            <button type="submit" className="secondary">Add the starting locations</button>
          </form>
        )}
        <AddLocationForm />

        <h2 id="public-holidays">Public holidays (all projects)</h2>
        <p className="muted">Each country&apos;s public holiday calendar, by year: load or reload them, see each location&apos;s total,
          and add or remove single holidays.</p>
        <p><Link className="button secondary" href="/reference/public-holidays">Open public holidays</Link></p>
    </>
  );
}
