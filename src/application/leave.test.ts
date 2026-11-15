import { beforeEach, describe, expect, it } from "vitest";
import { seedDrgw } from "../infrastructure/db/fixtures";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { getTeamPlan } from "./getTeamPlan";
import { addLeave, cancelLeave, listLeave } from "./leave";

// UC09 / FR-07: a person's own leave, separate from public holidays (sean, 15 Nov 2026).
// The planner takes off whichever is larger: booked leave or the location's availability forecast.

const actor = "Capacity Admin";
const week = { email: "a@example.com", startDate: "2026-11-02", endDate: "2026-11-06", type: "Annual leave", dayFraction: 1 };
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await seedDrgw(db); // a@example.com: DE-BY, 40h of 40, 100% on T017; November forecast 90%
});

const s001 = async () => (await getTeamPlan(db, { teamId: "T017", today: "2026-11-08" })).sprints.find((r) => r.periodId === "S001")!;

describe("leave", () => {
  it("is added, listed and logged", async () => {
    const result = await addLeave(db, actor, week);
    expect(result.ok).toBe(true);
    expect(await listLeave(db, "a@example.com")).toEqual([
      expect.objectContaining({ startDate: "2026-11-02", endDate: "2026-11-06", type: "Annual leave", dayFraction: 1, status: "Booked" }),
    ]);
    expect((await db.select().from(t.auditLog)).filter((a) => a.entity === "absences")).toHaveLength(1);
  });

  it("is refused when the rules fail, and nothing is saved", async () => {
    expect(await addLeave(db, actor, { ...week, endDate: "2026-11-01" }))
      .toEqual({ ok: false, errors: ["End date can't be before the start date"] });
    expect(await addLeave(db, actor, { ...week, email: "nobody@example.com" }))
      .toEqual({ ok: false, errors: ["Unknown person nobody@example.com"] });
    expect(await listLeave(db, "a@example.com")).toEqual([]);
  });

  it("the planner takes a booked week off: 5 days instead of the 1-day forecast", async () => {
    const before = await s001();
    await addLeave(db, actor, week);
    expect((await s001()).calendarAvailableDays).toBeCloseTo(before.calendarAvailableDays - 4);
  });

  it("cancelling keeps the record but the planner ignores it", async () => {
    const before = await s001();
    const added = await addLeave(db, actor, week);
    if (!added.ok) throw new Error("not added");
    expect(await cancelLeave(db, actor, { id: added.id })).toEqual({ ok: true, id: added.id });
    expect((await listLeave(db, "a@example.com"))[0]?.status).toBe("Cancelled");
    expect((await s001()).calendarAvailableDays).toBeCloseTo(before.calendarAvailableDays);
  });
});
