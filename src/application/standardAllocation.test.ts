import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import * as t from "../infrastructure/db/schema";
import { getTeamDefaults } from "./getTeamDefaults";
import { getStandardAllocation, saveStandardAllocation } from "./standardAllocation";
import { addTeam } from "./teams";

// Standard allocation (sean, 15 Nov 2026): each project has one set of default work allocations
// that a new team adopts as its team default. Changing it later does not change existing teams.

const actor = "Capacity Admin";
const standard = { overhead: 0.2, contingency: 0.05, split: { run: 0.2, fix: 0.15, sustain: 0.15, change: 0.4, enabling: 0.1 } };
const newTeam = { id: "T100", name: "Payments", valueStream: "Platform", leadEmail: "", effectiveFrom: "2026-11-09" };
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
});

describe("standard allocation", () => {
  it("is empty until it is set", async () => {
    expect(await getStandardAllocation(db)).toBeNull();
  });

  it("is saved and read back, and the change is logged", async () => {
    expect(await saveStandardAllocation(db, actor, standard)).toEqual({ ok: true });
    expect(await getStandardAllocation(db)).toEqual(standard);
    await saveStandardAllocation(db, actor, { ...standard, overhead: 0.25 });
    expect((await getStandardAllocation(db))?.overhead).toBe(0.25);
    expect((await db.select().from(t.auditLog)).filter((a) => a.entity === "standard_allocation")).toHaveLength(2);
  });

  it("follows the same rules as a team default (BR-01, BR-02)", async () => {
    const result = await saveStandardAllocation(db, actor, { ...standard, split: { ...standard.split, change: 0.5 } });
    expect(result).toEqual({ ok: false, errors: ["Run + Fix + Sustain + Change + Enabling/Training must add up to 100%"] });
    expect(await saveStandardAllocation(db, actor, { ...standard, overhead: null }))
      .toEqual({ ok: false, errors: ["An Active default needs an overhead %"] });
    expect(await getStandardAllocation(db)).toBeNull();
  });

  it("a new team adopts it as an Active default from its start date", async () => {
    await saveStandardAllocation(db, actor, standard);
    await addTeam(db, actor, newTeam);
    const { current } = await getTeamDefaults(db, { teamId: "T100", today: "2026-11-09" });
    expect(current).toMatchObject({ status: "Active", effectiveFrom: "2026-11-09", overhead: 0.2, contingency: 0.05, split: standard.split });
  });

  it("without one, a new team starts with a Draft default as before (BR-17)", async () => {
    await addTeam(db, actor, newTeam);
    const { history } = await getTeamDefaults(db, { teamId: "T100", today: "2026-11-09" });
    expect(history.map((h) => h.status)).toEqual(["Draft"]);
  });

  it("changing it later leaves existing teams alone", async () => {
    await saveStandardAllocation(db, actor, standard);
    await addTeam(db, actor, newTeam);
    await saveStandardAllocation(db, actor, { ...standard, overhead: 0.3 });
    const { current } = await getTeamDefaults(db, { teamId: "T100", today: "2026-11-09" });
    expect(current?.overhead).toBe(0.2);
  });
});
