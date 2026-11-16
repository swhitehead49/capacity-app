import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import {
  getProjectMakeup, getValueStreamTeams, linkValueStream, listProjectTeams, setTeamIncluded, unlinkValueStream,
} from "./projectValueStreams";

// sean, 15 Nov 2026: once teams are uploaded, map them to value streams. A project has its own list of value streams
// (picked from the system's list); each value stream's teams can be seen and changed. Teams without a value stream
// can be included in or excluded from the project.

const actor = "Capacity Admin";
const today = "2026-11-15";
let db: Db;

beforeEach(async () => {
  db = await createTestDb(); // in these tests the project's database also holds the system's lists
  await db.insert(t.valueStreams).values(["Clinical", "Platform", "Radiology"].map((name) => ({ name })));
  await db.insert(t.projectValueStreams).values({ name: "Radiology" });
  await db.insert(t.teams).values([
    { id: "T1", name: "Viewer", valueStream: "Radiology" },
    { id: "T2", name: "Payments", valueStream: null },
    { id: "T3", name: "Billing", valueStream: null },
    { id: "T4", name: "Old team", valueStream: null, retiredOn: "2026-01-31" },
  ]);
});

const team = (id: string) => db.query.teams.findFirst({ where: eq(t.teams.id, id) });
const audit = async () => (await db.select().from(t.auditLog)).at(-1);

describe("getProjectMakeup", () => {
  it("lists the project's value streams with their teams, and the teams without one", async () => {
    await linkValueStream(db, actor, { name: "Clinical" });
    const makeup = await getProjectMakeup(db, today);
    expect(makeup.valueStreams).toEqual([
      { name: "Clinical", teams: 0, members: 0 },
      { name: "Radiology", teams: 1, members: 0 },
    ]);
    expect(makeup.unmapped.map((x) => [x.id, x.included])).toEqual([["T2", true], ["T3", true]]); // retired T4 left out
    expect(makeup.error).toBeNull();
  });

  it('says "No value streams in the project" when it has none', async () => {
    await unlinkValueStream(db, actor, { name: "Radiology" });
    expect((await getProjectMakeup(db, today)).error).toBe("No value streams in the project");
  });

  it("offers the system's value streams the project doesn't have yet", async () => {
    expect((await getProjectMakeup(db, today)).canAdd).toEqual(["Clinical", "Platform"]);
  });
});

describe("linkValueStream / unlinkValueStream", () => {
  it("adds a value stream from the system's list and logs it", async () => {
    expect(await linkValueStream(db, actor, { name: "Clinical" })).toEqual({ ok: true });
    expect(await audit()).toMatchObject({ entity: "project_value_streams", entityId: "Clinical", action: "add" });
  });

  it("refuses one that isn't in the system's list, or is already in the project", async () => {
    expect(await linkValueStream(db, actor, { name: "Nowhere" })).toEqual({ ok: false, errors: ["Unknown value stream Nowhere: add it under Reference data first"] });
    expect(await linkValueStream(db, actor, { name: "Radiology" })).toEqual({ ok: false, errors: ["Radiology is already in the project"] });
  });

  it("removing a value stream takes its teams out of the project (sean, 15 Nov 2026): unmapped and Excluded, never deleted", async () => {
    expect(await unlinkValueStream(db, actor, { name: "Radiology" })).toEqual({ ok: true });
    // Master team list (sean, 15 Nov 2026): the team keeps its value stream; it just isn't in this project any more.
    expect(await team("T1")).toMatchObject({ valueStream: "Radiology" });
    const makeup = await getProjectMakeup(db, today);
    expect(makeup.unmapped.map((x) => x.id)).not.toContain("T1");
    expect((await listProjectTeams(db, today)).map((x) => x.id)).not.toContain("T1");
    expect(await audit()).toMatchObject({ entity: "project_value_streams", entityId: "Radiology", action: "remove" });
  });
});

describe("value stream teams", () => {
  it("shows a value stream's active teams (read-only: the Admin sets a team's value stream)", async () => {
    const view = await getValueStreamTeams(db, { name: "Radiology", today });
    expect(view.teams.map((x) => x.id)).toEqual(["T1"]);
  });
});

// Master team list (sean, 15 Nov 2026): a project's teams are those in its value streams, plus the teams
// without a value stream that it includes. Teams in other value streams belong to other projects.
describe("listProjectTeams", () => {
  it("lists the teams in the project's value streams and the included teams without one", async () => {
    await db.insert(t.teams).values({ id: "T5", name: "Elsewhere", valueStream: "Clinical" });
    await setTeamIncluded(db, actor, { teamId: "T3", included: false });
    expect((await listProjectTeams(db, today)).map((x) => x.id)).toEqual(["T1", "T2", "T4"]);
  });

  it("teams in a value stream outside the project are not offered as unmapped", async () => {
    await db.insert(t.teams).values({ id: "T5", name: "Elsewhere", valueStream: "Clinical" });
    expect((await getProjectMakeup(db, today)).unmapped.map((x) => x.id)).toEqual(["T2", "T3"]);
  });
});

describe("setTeamIncluded (teams without a value stream)", () => {
  it("excludes a team from the project and includes it again, logging each", async () => {
    expect(await setTeamIncluded(db, actor, { teamId: "T2", included: false })).toEqual({ ok: true });
    expect((await getProjectMakeup(db, today)).unmapped.find((x) => x.id === "T2")?.included).toBe(false);
    expect(await audit()).toMatchObject({ entity: "teams", entityId: "T2", action: "exclude" });
    await setTeamIncluded(db, actor, { teamId: "T2", included: true });
    expect((await team("T2"))?.included).toBe(true);
  });

  it("a team in a value stream is always included", async () => {
    expect(await setTeamIncluded(db, actor, { teamId: "T1", included: false }))
      .toEqual({ ok: false, errors: ["T1 is in Radiology, so it is part of the project"] });
  });
});
