import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { saveTeamDefault } from "./saveTeamDefault";

// UC03 / FR-10: the Capacity Admin saves a team default. Every change goes in the audit log.

let db: Db;
const actor = "capacity.admin@example.com";
const request = {
  teamId: "T017",
  status: "Active" as const,
  effectiveFrom: "2026-01-01",
  overhead: 0.2,
  split: { run: 0.3, fix: 0.2, sustain: 0.2, change: 0.3 },
  reason: "Agreed in planning",
};

beforeEach(async () => {
  db = await createTestDb();
  await db.insert(t.teams).values({ id: "T017", name: "DRGW" });
});

describe("saveTeamDefault", () => {
  it("saves a valid default", async () => {
    const result = await saveTeamDefault(db, actor, request);
    expect(result.ok).toBe(true);
    const rows = await db.select().from(t.allocationSettings);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ teamId: "T017", level: "Team default", status: "Active", overhead: 0.2, run: 0.3 });
  });

  it("records who saved it, when and why in the audit log", async () => {
    await saveTeamDefault(db, actor, request);
    const [entry] = await db.select().from(t.auditLog);
    expect(entry).toMatchObject({ actor, entity: "allocation_settings", action: "create", reason: "Agreed in planning" });
    expect(entry?.after).toMatchObject({ overhead: 0.2 });
  });

  it("refuses an invalid default and saves nothing", async () => {
    const result = await saveTeamDefault(db, actor, { ...request, split: { run: 0.5, fix: 0.5, sustain: 0.5, change: 0 } });
    expect(result).toEqual({ ok: false, errors: ["Run + Fix + Sustain + Change must add up to 100%"] });
    expect(await db.select().from(t.allocationSettings)).toHaveLength(0);
    expect(await db.select().from(t.auditLog)).toHaveLength(0);
  });

  it("refuses an unknown team", async () => {
    const result = await saveTeamDefault(db, actor, { ...request, teamId: "T999" });
    expect(result).toEqual({ ok: false, errors: ["Unknown team T999"] });
  });

  it("retires the previous Active default with the same date, so only one is in force", async () => {
    await saveTeamDefault(db, actor, request);
    await saveTeamDefault(db, actor, { ...request, overhead: 0.25 });
    const active = await db.select().from(t.allocationSettings).where(eq(t.allocationSettings.status, "Active"));
    expect(active).toHaveLength(1);
    expect(active[0]?.overhead).toBe(0.25);
    const actions = (await db.select().from(t.auditLog)).map((e) => e.action);
    expect(actions).toEqual(["create", "retire", "create"]);
  });
});
