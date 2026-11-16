// Creates a fresh LOCAL database with demo data: the DRGW pilot team plus two other teams.
// Usage: npm run seed   (DATA_DIR chooses the folder; default ./data/dev). It wipes that folder first.
// A hosted copy uses SEED_DEMO_DATA=true instead, which only fills an empty database.
import { rmSync } from "node:fs";
import path from "node:path";
import { ensurePeriods } from "../src/application/ensurePeriods";
import { getDb, getProjectDb, today } from "../src/infrastructure/db/appDb";
import { databaseConfig } from "../src/infrastructure/db/databaseConfig";
import { seedDemo } from "../src/infrastructure/db/demoData";
import { insertProject } from "../src/infrastructure/db/projectDatabases";
import * as t from "../src/infrastructure/db/schema";

const config = databaseConfig(process.env);
if (config.kind !== "folder") {
  console.error("npm run seed only works on a local folder. It never wipes an online database.");
  process.exit(1);
}
rmSync(path.resolve(config.dir), { recursive: true, force: true });
rmSync(path.resolve(`${config.dir}-projects`), { recursive: true, force: true }); // other projects too
const db = await getDb();
await seedDemo(db);
const added = await ensurePeriods(db, today());

// A second project with a team that so far only exists there: it joins the master team list when Imaging is opened.
await insertProject(db, { id: "imaging", name: "Imaging" });
const imaging = await getProjectDb("imaging");
await imaging.insert(t.teams).values({ id: "T900", name: "Imaging Core" });
await ensurePeriods(imaging, today(), db); // same sprint calendar as every project
console.log(`Seeded demo data (Default and Imaging projects); created ${added} planning periods.`);
process.exit(0);
