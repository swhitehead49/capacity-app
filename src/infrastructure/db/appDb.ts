import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import { migrate as migratePostgres } from "drizzle-orm/node-postgres/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { databaseConfig } from "./databaseConfig";
import { seedDemoIfEmpty } from "./demoData";
import * as schema from "./schema";
import type { Db } from "./testDb";

// The app's database: Postgres either in a local folder (PGlite) or online (DATABASE_URL, e.g. Neon).
// This is the only file that knows which; everything else just uses `Db`.

const globalForDb = globalThis as unknown as { capacityDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.capacityDb ??= open();
  return globalForDb.capacityDb;
}

async function open(): Promise<Db> {
  const config = databaseConfig(process.env);
  const migrationsFolder = path.resolve("./drizzle");
  let db: Db;
  if (config.kind === "postgres") {
    const online = drizzlePostgres(new Pool({ connectionString: config.url, max: 5 }), { schema });
    await migratePostgres(online, { migrationsFolder });
    db = online as unknown as Db; // same Postgres and same queries; only the driver differs
  } else {
    const dir = path.resolve(config.dir);
    mkdirSync(path.dirname(dir), { recursive: true });
    db = drizzlePglite(new PGlite(dir), { schema });
    await migratePglite(db, { migrationsFolder });
  }
  if (process.env.SEED_DEMO_DATA === "true" && (await seedDemoIfEmpty(db))) console.log("Loaded demo data into an empty database.");
  return db;
}

/** "Today" for the app. Tests fix it with APP_TODAY so results don't change from day to day. */
export function today(): string {
  return process.env.APP_TODAY ?? new Date().toISOString().slice(0, 10);
}
