import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import {
  getProjectMakeup, getProjectSetup, getValueStreamTeams, listProjectTeams, updateProjectTeams, updateProjectValueStreams,
} from "./projectValueStreams";

// FR-18s (sean, 22 Nov 2026): the Admin sets up each project in Reference data → Projects. One rule: a team is in the
// project when its tick is on. Ticking a value stream ticks all its teams (unticking it unticks them); a single team
// can then be ticked or unticked on its own, whatever its value stream.

const actor = "Capacity Admin";
const today = "2026-11-22";
let db: Db;

beforeEach(async () => {
  db = await createTestDb(); // in these tests the project's database also holds the system's lists
  await db.insert(t.valueStreams).values(["Clinical", "Platform", "Radiology"].map((name) => ({ name })));
  await db.insert(t.projectValueStreams).values({ name: "Radiology" });
  await db.insert(t.teams).values([
    { id: "T1", name: "Viewer", valueStream: "Radiology", included: true },
    { id: "T2", name: "Payments", valueStream: null, included: true },
    { id: "T3", name: "Billing", valueStream: null, included: false },
    { id: "T4", name: "Old team", valueStream: null, retiredOn: "2026-01-31" },
    { id: "T5", name: "Orders", valueStream: "Clinical", included: false },
    { id: "T6", name: "Results", valueStream: "Clinical", included: false },
  ]);
});

const included = async (id: string) => (await db.query.teams.findFirst({ where: eq(t.teams.id, id) }))?.included;
const ids = (teams: { id: string }[]) => teams.map((x) => x.id);

describe("getProjectSetup", () => {
  it("lists every system value stream and every active team, each with its tick", async () => {
    const setup = await getProjectSetup(db, today, db);
    expect(setup.valueStreams).toEqual([
      { name: "Clinical", included: false, teams: 2 },
      { name: "Platform", included: false, teams: 0 },
      { name: "Radiology", included: true, teams: 1 },
    ]);
    expect(setup.teams.map((x) => [x.id, x.included])).toEqual([["T1", true], ["T2", true], ["T3", false], ["T5", false], ["T6", false]]);
  });
});

describe("updateProjectValueStreams", () => {
  it("ticking a value stream adds it and ticks its teams; unticking removes it and unticks them; both logged", async () => {
    expect(await updateProjectValueStreams(db, actor, { names: ["Clinical"] }, db)).toEqual({ ok: true, added: ["Clinical"], removed: ["Radiology"] });
    expect([await included("T5"), await included("T6"), await included("T1")]).toEqual([true, true, false]);
    expect(await included("T2")).toBe(true); // teams without a value stream keep their own tick
    const log = await db.select().from(t.auditLog);
    expect(log.map((a) => [a.entity, a.entityId, a.action])).toEqual(expect.arrayContaining([
      ["project_value_streams", "Clinical", "add"], ["project_value_streams", "Radiology", "remove"], ["teams", "T5", "include"], ["teams", "T1", "exclude"],
    ]));
  });

  it("leaves a value stream that stays ticked, and its teams' own ticks, alone", async () => {
    await db.update(t.teams).set({ included: false }).where(eq(t.teams.id, "T1"));
    expect(await updateProjectValueStreams(db, actor, { names: ["Radiology"] }, db)).toEqual({ ok: true, added: [], removed: [] });
    expect(await included("T1")).toBe(false);
  });

  it("refuses a name that isn't in the system's list", async () => {
    expect(await updateProjectValueStreams(db, actor, { names: ["Nowhere"] }, db)).toEqual({ ok: false, errors: ["Unknown value stream Nowhere"] });
  });
});

describe("updateProjectTeams", () => {
  it("sets each listed team's tick, whatever its value stream, and logs only the changes", async () => {
    expect(await updateProjectTeams(db, actor, { teamIds: ["T1", "T2", "T3", "T5", "T6"], ticked: ["T3", "T5"] })).toEqual({ ok: true, changed: 4 });
    expect([await included("T1"), await included("T2"), await included("T3"), await included("T5"), await included("T6")])
      .toEqual([false, false, true, true, false]);
    expect((await db.select().from(t.auditLog)).filter((a) => a.entity === "teams")).toHaveLength(4);
  });

  it("refuses an unknown team", async () => {
    expect(await updateProjectTeams(db, actor, { teamIds: ["T9"], ticked: [] })).toEqual({ ok: false, errors: ["Unknown team T9"] });
  });
});

describe("listProjectTeams", () => {
  it("the project's teams are the ticked ones (retired ones too, for past periods)", async () => {
    await db.update(t.teams).set({ included: true }).where(eq(t.teams.id, "T5"));
    expect(ids(await listProjectTeams(db, today))).toEqual(["T1", "T2", "T4", "T5"]);
  });
});

describe("getProjectMakeup (the manager's read-only Project home)", () => {
  it("shows the project's value streams with their ticked teams, and other ticked teams", async () => {
    await db.update(t.teams).set({ included: true }).where(eq(t.teams.id, "T5"));
    const makeup = await getProjectMakeup(db, today);
    expect(makeup.valueStreams).toEqual([{ name: "Radiology", teams: 1, members: 0 }]);
    expect(makeup.otherTeams.map((x) => [x.id, x.valueStream])).toEqual([["T2", null], ["T5", "Clinical"]]);
    expect(makeup.error).toBeNull();
  });

  it('says "No value streams in the project" when it has none', async () => {
    await db.delete(t.projectValueStreams);
    expect((await getProjectMakeup(db, today)).error).toBe("No value streams in the project");
  });
});

describe("getValueStreamTeams", () => {
  it("shows a value stream's active teams and whether each is in the project", async () => {
    const result = await getValueStreamTeams(db, { name: "Clinical", today });
    expect(result.inProject).toBe(false);
    expect(result.teams.map((x) => [x.id, x.included])).toEqual([["T5", false], ["T6", false]]);
  });
});
