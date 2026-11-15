import { readFileSync } from "node:fs";
import { asc, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import * as t from "./schema";
import { createTestDb, type Db } from "./testDb";

// One 100% (sean, 15 Nov 2026): migration 0007 converts settings saved the old way, where Run/Fix/Sustain/Change/Enabling
// added up to 100% of what was left after overhead and contingency. Every planner number must stay the same:
//   new contingency = (1 − overhead) × contingency
//   new share       = (1 − overhead) × (1 − contingency) × share
// An override that left overhead or contingency blank first takes them from the team default in force at its start.

const migration = readFileSync("drizzle/0007_one_hundred_percent.sql", "utf8");
const rerun = async (db: Db) => {
  for (const statement of migration.split("--> statement-breakpoint")) if (statement.trim()) await db.execute(sql.raw(statement));
};
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await db.insert(t.teams).values({ id: "T017", name: "DRGW" });
  await db.insert(t.planningPeriods).values({ id: "S001", type: "Sprint", startDate: "2026-10-26", endDate: "2026-11-08" });
});

describe("migration 0007: one 100%", () => {
  it("converts a team default so the days stay the same", async () => {
    await db.insert(t.allocationSettings).values({
      teamId: "T017", level: "Team default", effectiveFrom: "2026-01-01", status: "Active",
      overhead: 0.2, contingency: 0.1, run: 0.3, fix: 0.2, sustain: 0.2, change: 0.3, enabling: 0,
    });
    await rerun(db);
    const [row] = await db.select().from(t.allocationSettings);
    expect(row?.overhead).toBeCloseTo(0.2);
    expect(row?.contingency).toBeCloseTo(0.08); // 80% × 10%
    expect(row?.run).toBeCloseTo(0.216); // 80% × 90% × 30%
    expect(row?.change).toBeCloseTo(0.216);
    const total = row!.overhead! + row!.contingency! + row!.run + row!.fix + row!.sustain + row!.change + row!.enabling;
    expect(total).toBeCloseTo(1);
  });

  it("fills an override's blank overhead and contingency from the team default, then converts it", async () => {
    await db.insert(t.allocationSettings).values([
      { teamId: "T017", level: "Team default", effectiveFrom: "2026-01-01", status: "Active", overhead: 0.2, contingency: null, run: 0.3, fix: 0.2, sustain: 0.2, change: 0.3 },
      { teamId: "T017", level: "Sprint override", periodId: "S001", status: "Active", overhead: null, contingency: null, run: 0.5, fix: 0.5, sustain: 0, change: 0, reason: "x" },
    ]);
    await rerun(db);
    const rows = await db.select().from(t.allocationSettings).orderBy(asc(t.allocationSettings.id));
    expect(rows[1]).toMatchObject({ overhead: 0.2, contingency: 0 });
    expect(rows[1]?.run).toBeCloseTo(0.4);
    expect(rows[0]?.contingency).toBe(0);
  });

  it("leaves Draft defaults without an overhead alone", async () => {
    await db.insert(t.allocationSettings).values({
      teamId: "T017", level: "Team default", status: "Draft", overhead: null, run: 0, fix: 0, sustain: 0, change: 0,
    });
    await rerun(db);
    expect((await db.select().from(t.allocationSettings))[0]).toMatchObject({ overhead: null, run: 0 });
  });

  it("converts the project's standard allocation too", async () => {
    await db.insert(t.standardAllocation).values({ id: 1, overhead: 0.2, contingency: 0, run: 0.25, fix: 0.25, sustain: 0.25, change: 0.25, enabling: 0 });
    await rerun(db);
    expect((await db.select().from(t.standardAllocation))[0]?.run).toBeCloseTo(0.2);
  });
});
