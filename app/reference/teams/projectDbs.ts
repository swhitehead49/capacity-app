import { DEFAULT_PROJECT } from "@/src/domain/projects/projectRules";
import { getDb, getProjectDb } from "@/src/infrastructure/db/appDb";
import { listProjects } from "@/src/infrastructure/db/projectDatabases";

/** Every project other than Default (archived ones too), for changes the master team list makes everywhere. */
export async function allProjectDbs() {
  const projects = (await listProjects(await getDb())).filter((p) => p.id !== DEFAULT_PROJECT);
  return Promise.all(projects.map(async (p) => ({ name: p.name, db: await getProjectDb(p.id) })));
}
