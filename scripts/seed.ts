// Creates a fresh database with demo data: the DRGW pilot team plus two other teams.
// Usage: npm run seed   (DATA_DIR chooses the folder; default ./data/dev)
import { rmSync } from "node:fs";
import path from "node:path";
import { ensurePeriods } from "../src/application/ensurePeriods";
import { getDb, today } from "../src/infrastructure/db/appDb";
import { seedDrgw } from "../src/infrastructure/db/fixtures";
import * as t from "../src/infrastructure/db/schema";

rmSync(path.resolve(process.env.DATA_DIR ?? "./data/dev"), { recursive: true, force: true });
const db = await getDb();
await db.insert(t.timelineSettings).values({ id: 1, firstSprintStart: "2026-10-26", sprintLengthDays: 14, sprintPrefix: "S" });
await seedDrgw(db);
await db.insert(t.teams).values([
  { id: "T001", name: "Example Team A" },
  { id: "T002", name: "Example Team B" },
]);
// An India office (no people yet), so the Holidays page shows the CSV upload calendars.
await db.insert(t.locations).values({ code: "IN-KA", country: "IN", name: "Bangalore", standardHours: 40 });
const added = await ensurePeriods(db, today());
console.log(`Seeded demo data; created ${added} planning periods.`);
process.exit(0);
