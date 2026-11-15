import { getStandardAllocation, getSystemStandard } from "@/src/application/standardAllocation";
import { DEFAULT_PROJECT } from "@/src/domain/projects/projectRules";
import { projectDb, sharedDb } from "@/app/lib/project";
import { describeStandard, standardFormValues } from "@/app/lib/standardValues";
import { archiveProjectAction } from "@/app/projects/actions";
import { RenameProjectForm } from "@/app/projects/ProjectForms";
import { backToSystemStandardAction } from "./actions";
import { StandardForm } from "./StandardForm";

export const dynamic = "force-dynamic";

/** Project reference data (sean, 15 Nov 2026): this project's own settings, for Engineering managers only. */
export default async function ProjectReferenceData({ params, searchParams }: {
  params: Promise<{ projectId: string }>; searchParams: Promise<{ saved?: string }>;
}) {
  const { projectId } = await params;
  const { saved } = await searchParams;
  const { project, db } = await projectDb(projectId);
  const standard = await getStandardAllocation(db);
  const system = await getSystemStandard(await sharedDb());
  const values = standardFormValues(standard ?? system);
  return (
    <>
      <h1>Project reference data</h1>
      <p className="muted">Settings for {project.name} only. Other projects have their own.</p>

      <h2 id="standard-allocation">Standard allocation for new teams</h2>
      <p className="muted">
        A team added to {project.name} starts with these percentages as its team default, in force from its start date,
        so its planner is Ready straight away. You can still change any team&apos;s default afterwards.
        Changing the standard here does not change existing teams.
      </p>
      {standard
        ? (
          <>
            <p>{project.name} has its own standard allocation.</p>
            {system && (
              <form action={backToSystemStandardAction} className="inline">
                <input type="hidden" name="projectId" value={project.id} />
                <span className="muted">The system standard is {describeStandard(system)}. </span>
                <button type="submit" className="secondary">Use the system standard</button>
              </form>
            )}
          </>
        )
        : system
          ? <p>Using the system standard allocation: {describeStandard(system)}. Save below to give {project.name} its own.</p>
          : <p>No standard allocation is set for {project.name} or for the system, so a new team starts with a Draft default.</p>}
      {saved && <p role="status" className="notice">Saved. New teams will start with this allocation.</p>}
      <StandardForm projectId={project.id} values={values} />

      <h2 id="project">Project</h2>
      <p className="muted">Its web address stays /p/{project.id} after a rename, so links keep working.</p>
      <RenameProjectForm projectId={project.id} name={project.name} />
      {project.id !== DEFAULT_PROJECT && (
        <form action={archiveProjectAction} className="archive">
          <input type="hidden" name="projectId" value={project.id} />
          <p className="muted">Archiving hides the project from the project list. Nothing is deleted, and you can restore it there.</p>
          <button type="submit" className="secondary danger">Archive project</button>
        </form>
      )}
    </>
  );
}
