import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import type { Db } from "./testDb";

// The app's database. For now it is Postgres (PGlite) stored in a local folder;
// later this file is the only place that changes to point at a hosted Postgres.

const globalForDb = globalThis as unknown as { capacityDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.capacityDb ??= open();
  return globalForDb.capacityDb;
}

async function open(): Promise<Db> {
  const dir = path.resolve(process.env.DATA_DIR ?? "./data/dev");
  mkdirSync(path.dirname(dir), { recursive: true });
  const db = drizzle(new PGlite(dir), { schema });
  await migrate(db, { migrationsFolder: path.resolve("./drizzle") });
  return db;
}

/** "Today" for the app. Tests fix it with APP_TODAY so results don't change from day to day. */
export function today(): string {
  return process.env.APP_TODAY ?? new Date().toISOString().slice(0, 10);
}
