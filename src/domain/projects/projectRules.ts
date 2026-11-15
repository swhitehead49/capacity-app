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

/** The project in a web address such as /p/imaging/teams, or null when the address is not inside a project. */
export function projectInAddress(pathname: string): string | null {
  const id = /^\/p\/([^/]+)/.exec(pathname)?.[1];
  return id && PROJECT_ID.test(id) ? id : null;
}

/**
 * A web-address ID made from a project's name (sean, 15 Nov 2026: people only type a name).
 * Lower-case letters, digits and dashes, starting with a letter, at most 30 long, and not already taken.
 */
export function projectIdFromName(name: string, taken: string[]): string {
  let base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!/^[a-z]/.test(base)) base = `p-${base}`.replace(/-+$/, "");
  if (base.length < 2) base = "project";
  base = base.slice(0, 26).replace(/-+$/, ""); // room for "-99"
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}
