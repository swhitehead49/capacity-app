import { beforeEach, describe, expect, it } from "vitest";
import { teamCapacity } from "../../domain/capacity/teamCapacity";
import * as t from "./schema";
import { loadTeamCapacityInput } from "./teamCapacityRepository";
import { createTestDb, type Db } from "./testDb";
import { seedDrgw } from "./fixtures";

// Step 3: the same DRGW sprint as teamCapacity.test.ts, but stored in a real (in-memory)
// Postgres database and loaded back. If this passes, the database and the engine agree.

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await seedDrgw(db);
});

describe("loadTeamCapacityInput", () => {
  it("loads DRGW for S001 and gives the same answer as the engine test", async () => {
    const input = await loadTeamCapacityInput(db, { teamId: "T017", periodId: "S001", mode: "Auto" });
    const result = teamCapacity(input);
    expect(result.headcount).toBe(10);
    expect(result.allocatedFte).toBeCloseTo(8.06);
    expect(result.scheduledDays).toBeCloseTo(80.6);
    expect(result.calendarAvailableDays).toBeCloseTo(72.54);
    expect(result.engineeringDays).toBeCloseTo(58.032);
  });

  it("uses an Active quarter override for a sprint inside that quarter (FR-12)", async () => {
    await db.insert(t.allocationSettings).values({
      teamId: "T017", level: "Quarter override", periodId: "2026-Q4", status: "Active",
      overhead: null, run: 0.4, fix: 0.2, sustain: 0.1, change: 0.3, reason: "Release quarter",
    });
    const input = await loadTeamCapacityInput(db, { teamId: "T017", periodId: "S001", mode: "Auto" });
    expect(input.allocation.splitSource).toBe("Quarter override");
    expect(input.allocation.overheadSource).toBe("Team default");
  });

  it("leaves out someone whose assignment ended before the sprint (BR-22)", async () => {
    await db.insert(t.people).values({ email: "left@example.com", locationCode: "DE-RP", contractedHours: 40 });
    await db.insert(t.assignments).values({
      personEmail: "left@example.com", teamId: "T017", teamAllocation: 1, endDate: "2026-09-30",
    });
    const input = await loadTeamCapacityInput(db, { teamId: "T017", periodId: "S001", mode: "Auto" });
    expect(input.members).toHaveLength(10);
  });

  it("fails clearly for an unknown period", async () => {
    await expect(loadTeamCapacityInput(db, { teamId: "T017", periodId: "S999", mode: "Auto" }))
      .rejects.toThrow("Unknown planning period S999");
  });
});
