import { getStandardAllocation } from "@/src/application/standardAllocation";
import { projectDb } from "@/app/lib/project";
import { percent } from "@/app/lib/format";
import { StandardForm } from "./StandardForm";
import { archiveProjectAction } from "@/app/projects/actions";
import { RenameProjectForm } from "@/app/projects/ProjectForms";
import { DEFAULT_PROJECT } from "@/src/domain/projects/projectRules";

export const dynamic = "force-dynamic";

/** Project settings: the standard allocation that new teams adopt (sean, 15 Nov 2026). */
export default async function ProjectSettings({ params, searchParams }: {
  params: Promise<{ projectId: string }>; searchParams: Promise<{ saved?: string }>;
}) {
  const { projectId } = await params;
  const { saved } = await searchParams;
  const { project, db } = await projectDb(projectId);
  const standard = await getStandardAllocation(db);
  const values: Record<string, string> = standard
    ? {
      overhead: percent(standard.overhead), contingency: percent(standard.contingency),
      run: percent(standard.split.run), fix: percent(standard.split.fix), sustain: percent(standard.split.sustain),
      change: percent(standard.split.change), enabling: percent(standard.split.enabling),
    }
    : {};
  return (
    <>
      <h1>{project.name} settings</h1>
      <h2>Standard allocation for new teams</h2>
      <p className="muted">
        A team added to this project starts with these percentages as its team default, in force from its start date,
        so its planner is Ready straight away. You can still change any team&apos;s default afterwards.
        Changing the standard here does not change existing teams.
        {!standard && " Until it is set, a new team starts with a Draft default."}
      </p>
      {saved && <p role="status" className="notice">Saved. New teams will start with this allocation.</p>}
      <StandardForm values={values} />

      <h2>Project</h2>
      <p className="muted">Its web address stays /p/{project.id} after a rename, so links keep working.</p>
      <RenameProjectForm name={project.name} />
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
