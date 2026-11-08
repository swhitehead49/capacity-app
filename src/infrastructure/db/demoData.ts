import { seedDrgw } from "./fixtures";
import * as t from "./schema";
import type { Db } from "./testDb";

/** The demo data: timeline settings, the DRGW pilot team, two example teams and an India office. */
export async function seedDemo(db: Db) {
  await db.insert(t.timelineSettings).values({ id: 1, firstSprintStart: "2026-10-26", sprintLengthDays: 14, sprintPrefix: "S" });
  await seedDrgw(db);
  await db.insert(t.teams).values([
    { id: "T001", name: "Example Team A" },
    { id: "T002", name: "Example Team B" },
  ]);
  // An India office (no people yet), so the Holidays page shows the CSV upload calendars.
  await db.insert(t.locations).values({ code: "IN-KA", country: "IN", name: "Bangalore", standardHours: 40 });
}

/** Loads the demo data only into a database with no teams and no timeline. Returns whether it did. */
export async function seedDemoIfEmpty(db: Db): Promise<boolean> {
  const [anyTeam] = await db.select({ id: t.teams.id }).from(t.teams).limit(1);
  const [timeline] = await db.select({ id: t.timelineSettings.id }).from(t.timelineSettings).limit(1);
  if (anyTeam || timeline) return false;
  await seedDemo(db);
  return true;
}
