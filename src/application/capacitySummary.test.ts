import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { generateQuarters, generateSprints } from "../domain/planning/periods";
import { seedDrgw } from "../infrastructure/db/fixtures";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { getCapacitySummary } from "./capacitySummary";
import { getTeamPlan } from "./getTeamPlan";

// FR-19c (sean, 24 Nov 2026): a Capacity Summary page. For each sprint (and quarter) of the sprint calendar, the capacity
// of a) all the project's teams together, b) one value stream, or c) one team, broken down by category.

const today = "2026-11-08";
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await seedDrgw(db); // T017 DRGW, 10 people, an Active default (overhead 20%), in the project
  const extraQuarters = generateQuarters({ from: "2027-01-01", count: 8 });
  const extraSprints = generateSprints({ firstStart: "2026-10-26", lengthDays: 14, count: 52, prefix: "S" }).slice(1);
  await db.insert(t.planningPeriods).values([...extraQuarters, ...extraSprints].map((p) => ({
    id: p.id, type: p.type, startDate: p.start, endDate: p.end, parentPeriodId: p.parentId,
  })));
  // T002 in Platform: two people, no allocation yet. T003 is not in the project.
  await db.insert(t.teams).values([
    { id: "T002", name: "Payments", valueStream: "Platform", baseLocation: "DE", included: true },
    { id: "T003", name: "Elsewhere", valueStream: "Platform", included: false },
  ]);
  await db.insert(t.people).values([
    { email: "x@example.com", locationCode: "DE-BY", contractedHours: 40 },
    { email: "y@example.com", locationCode: "DE-BY", contractedHours: 40 },
    { email: "z@example.com", locationCode: "DE-BY", contractedHours: 40 },
  ]);
  await db.insert(t.assignments).values([
    { personEmail: "x@example.com", teamId: "T002", teamAllocation: 1 },
    { personEmail: "y@example.com", teamId: "T002", teamAllocation: 1 },
    { personEmail: "z@example.com", teamId: "T003", teamAllocation: 1 },
  ]);
});

const s001 = async (scope: Parameters<typeof getCapacitySummary>[1]["scope"]) =>
  (await getCapacitySummary(db, { today, scope })).sprints.find((r) => r.periodId === "S001")!;

describe("getCapacitySummary (FR-19c)", () => {
  it("one team: the same numbers as its Team Planner, with overhead shown as days", async () => {
    const plan = (await getTeamPlan(db, { teamId: "T017", today })).sprints[0]!;
    const row = await s001({ kind: "team", teamId: "T017" });
    expect(row).toMatchObject({ teams: 1, headcount: 10, notAllocated: 0 });
    expect(row.available).toBeCloseTo(plan.calendarAvailableDays);
    expect(row.overhead).toBeCloseTo(plan.calendarAvailableDays * 0.2);
    expect(row.run).toBeCloseTo(plan.run!);
    expect(row.change).toBeCloseTo(plan.change!);
  });

  it("all teams: adds up every team in the project; a team without an allocation counts as Not allocated", async () => {
    const drgw = await s001({ kind: "team", teamId: "T017" });
    const payments = await s001({ kind: "team", teamId: "T002" });
    const all = await s001({ kind: "all" });
    expect(all.teams).toBe(2); // T003 is not in the project
    expect(all.headcount).toBe(12);
    expect(payments.notAllocated).toBeCloseTo(payments.available);
    expect(payments.available).toBeGreaterThan(0);
    expect(all.available).toBeCloseTo(drgw.available + payments.available);
    expect(all.run).toBeCloseTo(drgw.run);
    expect(all.notAllocated).toBeCloseTo(payments.available);
    const categories = all.overhead + all.contingency + all.run + all.fix + all.sustain + all.change + all.enabling + all.notAllocated;
    expect(categories).toBeCloseTo(all.available); // the categories always add up to the available days
  });

  it("one value stream: only its teams in the project", async () => {
    const row = await s001({ kind: "valueStream", name: "Platform" });
    expect(row).toMatchObject({ teams: 1, headcount: 2 });
  });

  it("gives quarters too, and leaves out retired teams", async () => {
    await db.update(t.teams).set({ retiredOn: "2026-01-01" }).where(eq(t.teams.id, "T002"));
    const summary = await getCapacitySummary(db, { today, scope: { kind: "all" } });
    expect(summary.quarters.map((q) => q.periodId)[0]).toBe("2026-Q4");
    expect(summary.sprints[0]?.teams).toBe(1);
  });
});
