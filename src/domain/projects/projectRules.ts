// Projects (decided 15 Nov 2026): one level of projects at the top: project → value streams → teams.

export interface ProjectDraft {
  id: string;
  name: string;
}

export const DEFAULT_PROJECT = "default";

/** A project ID: it becomes part of web addresses, so it is kept simple. */
const PROJECT_ID = /^[a-z][a-z0-9-]{1,29}$/;

export function validateProject(project: ProjectDraft): string[] {
  const errors: string[] = [];
  if (!PROJECT_ID.test(project.id)) {
    errors.push("Project ID must be 2–30 lower-case letters, digits or dashes, starting with a letter");
  }
  if (!project.name.trim()) errors.push("Project name is needed");
  return errors;
}

/** Where a project's tables live in Postgres. Default keeps the original ("public") tables. */
export function projectStorageName(projectId: string): string {
  return projectId === DEFAULT_PROJECT ? "public" : `project_${projectId.replaceAll("-", "_")}`;
}

/** Where the app opens: the project used last, if it is still open; otherwise the project picker. */
export function startAddress(remembered: string | undefined, projects: { id: string; archivedAt: Date | null }[]): string {
  const project = projects.find((p) => p.id === remembered && p.archivedAt === null);
  return project ? `/p/${project.id}` : "/projects";
}

/** The project in a web address such as /p/imaging/teams, or null when the address is not inside a project. */
export function projectInAddress(pathname: string): string | null {
  const id = /^\/p\/([^/]+)/.exec(pathname)?.[1];
  return id && PROJECT_ID.test(id) ? id : null;
}
