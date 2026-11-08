import { beforeEach, describe, expect, it } from "vitest";
import { seedDrgw } from "../infrastructure/db/fixtures";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { getTeamDefaults } from "./getTeamDefaults";
import { saveTeamDefault } from "./saveTeamDefault";

// UC03: the team default page shows the default in force today and every version before and after it.

let db: Db;
const split = { run: 0.25, fix: 0.25, sustain: 0.25, change: 0.25 };

beforeEach(async () => {
  db = await createTestDb();
  await seedDrgw(db); // T017: Active default from 1 Jan 2026, 20% overhead, 30/20/20/30
  await db.insert(t.teams).values({ id: "T001", name: "Example Team A" });
});

describe("getTeamDefaults", () => {
  it("gives the default in force today", async () => {
    const { team, current } = await getTeamDefaults(db, { teamId: "T017", today: "2026-11-08" });
    expect(team.name).toBe("DRGW");
    expect(current).toMatchObject({
      effectiveFrom: "2026-01-01", status: "Active", overhead: 0.2,
      split: { run: 0.3, fix: 0.2, sustain: 0.2, change: 0.3 },
    });
  });

  it("a future default is listed but does not apply yet", async () => {
    await saveTeamDefault(db, "Capacity Admin", { teamId: "T017", status: "Active", effectiveFrom: "2027-01-01", overhead: 0.1, split, reason: "New year" });
    const { current, history } = await getTeamDefaults(db, { teamId: "T017", today: "2026-11-08" });
    expect(current?.effectiveFrom).toBe("2026-01-01");
    expect(history.map((h) => [h.effectiveFrom, h.status, h.reason])).toEqual([
      ["2027-01-01", "Active", "New year"],
      ["2026-01-01", "Active", null],
    ]);
  });

  it("history includes drafts and retired versions, newest first", async () => {
    await saveTeamDefault(db, "Capacity Admin", { teamId: "T017", status: "Draft", effectiveFrom: null, overhead: null, split });
    await saveTeamDefault(db, "Capacity Admin", { teamId: "T017", status: "Active", effectiveFrom: "2026-01-01", overhead: 0.15, split });
    const { current, history } = await getTeamDefaults(db, { teamId: "T017", today: "2026-11-08" });
    expect(current?.overhead).toBe(0.15);
    expect(history.map((h) => h.status)).toEqual(["Draft", "Active", "Retired"]);
  });

  it("a team without a default has none in force (calendar capacity only)", async () => {
    const { current, history } = await getTeamDefaults(db, { teamId: "T001", today: "2026-11-08" });
    expect(current).toBeNull();
    expect(history).toEqual([]);
  });

  it("an unknown team is an error", async () => {
    await expect(getTeamDefaults(db, { teamId: "NOPE", today: "2026-11-08" })).rejects.toThrow("Unknown team NOPE");
  });
});
