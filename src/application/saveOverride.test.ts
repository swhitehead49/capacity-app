import { beforeEach, describe, expect, it } from "vitest";
import { seedDrgw } from "../infrastructure/db/fixtures";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { getOverride, saveOverride } from "./saveOverride";

// UC04 / FR-11: create or change the override for one team and one sprint or quarter.

let db: Db;
const actor = "capacity.admin@example.com";
const request = {
  teamId: "T017",
  periodId: "S001",
  status: "Active" as const,
  overhead: null,
  split: { run: 0.5, fix: 0.2, sustain: 0.1, change: 0.2 },
  reason: "Release sprint",
};

beforeEach(async () => {
  db = await createTestDb();
  await seedDrgw(db);
});

describe("saveOverride", () => {
  it("creates a sprint override for a sprint, and logs it", async () => {
    expect(await saveOverride(db, actor, request)).toMatchObject({ ok: true });
    const rows = (await db.select().from(t.allocationSettings)).filter((r) => r.level !== "Team default");
    expect(rows).toEqual([expect.objectContaining({ level: "Sprint override", periodId: "S001", run: 0.5, overhead: null, owner: actor })]);
    expect((await db.select().from(t.auditLog)).map((e) => e.action)).toEqual(["create"]);
  });

  it("creates a quarter override for a quarter", async () => {
    await saveOverride(db, actor, { ...request, periodId: "2026-Q4" });
    const rows = (await db.select().from(t.allocationSettings)).filter((r) => r.level !== "Team default");
    expect(rows[0]?.level).toBe("Quarter override");
  });

  it("changes the existing override instead of adding a second one", async () => {
    await saveOverride(db, actor, request);
    await saveOverride(db, actor, { ...request, split: { run: 0.4, fix: 0.3, sustain: 0.1, change: 0.2 } });
    const rows = (await db.select().from(t.allocationSettings)).filter((r) => r.level !== "Team default");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.run).toBe(0.4);
    const log = await db.select().from(t.auditLog);
    expect(log.map((e) => e.action)).toEqual(["create", "update"]);
    expect(log[1]?.before).toMatchObject({ run: 0.5 });
  });

  it("refuses an invalid override and saves nothing", async () => {
    const result = await saveOverride(db, actor, { ...request, reason: "" });
    expect(result).toEqual({ ok: false, errors: ["An Active override needs a reason"] });
    expect(await db.select().from(t.auditLog)).toHaveLength(0);
  });

  it("refuses an unknown period", async () => {
    expect(await saveOverride(db, actor, { ...request, periodId: "S999" }))
      .toEqual({ ok: false, errors: ["Unknown planning period S999"] });
  });
});

describe("getOverride", () => {
  it("shows what applies now and that there is no override yet", async () => {
    const view = await getOverride(db, { teamId: "T017", periodId: "S001" });
    expect(view.period).toMatchObject({ id: "S001", type: "Sprint" });
    expect(view.level).toBe("Sprint override");
    expect(view.override).toBeNull();
    expect(view.currentlyApplied).toMatchObject({ splitSource: "Team default", overhead: 0.2 });
  });

  it("returns the saved override for editing", async () => {
    await saveOverride(db, actor, request);
    const view = await getOverride(db, { teamId: "T017", periodId: "S001" });
    expect(view.override).toMatchObject({ status: "Active", reason: "Release sprint", split: request.split });
  });
});
