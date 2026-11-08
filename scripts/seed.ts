// Creates a fresh LOCAL database with demo data: the DRGW pilot team plus two other teams.
// Usage: npm run seed   (DATA_DIR chooses the folder; default ./data/dev). It wipes that folder first.
// A hosted copy uses SEED_DEMO_DATA=true instead, which only fills an empty database.
import { rmSync } from "node:fs";
import path from "node:path";
import { ensurePeriods } from "../src/application/ensurePeriods";
import { getDb, today } from "../src/infrastructure/db/appDb";
import { databaseConfig } from "../src/infrastructure/db/databaseConfig";
import { seedDemo } from "../src/infrastructure/db/demoData";

const config = databaseConfig(process.env);
if (config.kind !== "folder") {
  console.error("npm run seed only works on a local folder. It never wipes an online database.");
  process.exit(1);
}
rmSync(path.resolve(config.dir), { recursive: true, force: true });
const db = await getDb();
await seedDemo(db);
const added = await ensurePeriods(db, today());
console.log(`Seeded demo data; created ${added} planning periods.`);
process.exit(0);
