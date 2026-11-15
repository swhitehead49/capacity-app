// Projects (decided 15 Nov 2026): one level of projects at the top: project → value streams → teams.

export interface ProjectDraft {
  id: string;
  name: string;
}

export const DEFAULT_PROJECT = "default";

export function validateProject(project: ProjectDraft): string[] {
  const errors: string[] = [];
  if (!/^[a-z][a-z0-9-]{1,29}$/.test(project.id)) {
    errors.push("Project ID must be 2–30 lower-case letters, digits or dashes, starting with a letter");
  }
  if (!project.name.trim()) errors.push("Project name is needed");
  return errors;
}

/** Where a project's tables live in Postgres. Default keeps the original ("public") tables. */
export function projectStorageName(projectId: string): string {
  return projectId === DEFAULT_PROJECT ? "public" : `project_${projectId.replaceAll("-", "_")}`;
}
