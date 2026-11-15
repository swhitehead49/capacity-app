import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import { migrate as migratePostgres } from "drizzle-orm/node-postgres/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { DEFAULT_PROJECT, projectStorageName } from "../../domain/projects/projectRules";
import { databaseConfig, directUrl, type DatabaseConfig } from "./databaseConfig";
import { seedDemoIfEmpty } from "./demoData";
import { ensureProjectRegistry, ProjectDatabases } from "./projectDatabases";
import * as schema from "./schema";
import type { Db } from "./testDb";

// The app's databases: Postgres either in local folders (PGlite) or online (DATABASE_URL, e.g. Neon).
// Each project has its own complete set of tables (decided 15 Nov 2026):
//   - local folders: Default uses DATA_DIR, another project uses DATA_DIR-projects/<id>
//   - online: Default uses the original tables, another project its own Postgres schema (project_<id>)
// This is the only file that knows where data lives; everything else just uses `Db`.

const globalForDb = globalThis as unknown as { capacityProjects?: ProjectDatabases };

function projects(): ProjectDatabases {
  globalForDb.capacityProjects ??= new ProjectDatabases((id) => openProject(databaseConfig(process.env), id));
  return globalForDb.capacityProjects;
}

/** One project's database. */
export function getProjectDb(projectId: string): Promise<Db> {
  return projects().get(projectId);
}

/** The Default project's database, which also holds the list of projects. */
export function getDb(): Promise<Db> {
  return getProjectDb(DEFAULT_PROJECT);
}

async function openProject(config: DatabaseConfig, projectId: string): Promise<Db> {
  const migrationsFolder = path.resolve("./drizzle");
  const isDefault = projectId === DEFAULT_PROJECT;
  let db: Db;
  if (config.kind === "postgres") {
    const storage = projectStorageName(projectId);
    const url = isDefault ? config.url : directUrl(config.url); // other projects need search_path: no pooler
    if (!isDefault) {
      const setup = new Pool({ connectionString: url, max: 1 });
      await setup.query(`create schema if not exists "${storage}"`);
      await setup.end();
    }
    const pool = new Pool({
      connectionString: url,
      max: 5,
      ...(isDefault ? {} : { options: `-c search_path="${storage}"` }),
    });
    const online = drizzlePostgres(pool, { schema });
    await migratePostgres(online, { migrationsFolder, ...(isDefault ? {} : { migrationsSchema: storage }) });
    db = online as unknown as Db; // same Postgres and same queries; only the driver differs
  } else {
    const dir = path.resolve(isDefault ? config.dir : `${config.dir}-projects/${projectId}`);
    mkdirSync(path.dirname(dir), { recursive: true });
    db = drizzlePglite(new PGlite(dir), { schema });
    await migratePglite(db, { migrationsFolder });
  }
  if (isDefault) {
    await ensureProjectRegistry(db);
    if (process.env.SEED_DEMO_DATA === "true" && (await seedDemoIfEmpty(db))) console.log("Loaded demo data into an empty database.");
  }
  return db;
}

/** "Today" for the app. Tests fix it with APP_TODAY so results don't change from day to day. */
export function today(): string {
  return process.env.APP_TODAY ?? new Date().toISOString().slice(0, 10);
}
