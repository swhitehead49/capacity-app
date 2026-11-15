import { beforeEach, describe, expect, it } from "vitest";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { getTeamDefaults } from "./getTeamDefaults";
import { importTeams } from "./importTeams";
import { saveStandardAllocation } from "./standardAllocation";

// Import teams from a spreadsheet saved as CSV (sean, 15 Nov 2026). All or nothing; each team is added as by "Add team".

const actor = "Capacity Admin";
const today = "2026-11-15";
const head = "team_id,name,value_stream,lead_email,start_date";
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await db.insert(t.teams).values({ id: "T017", name: "DRGW", valueStream: "Platform" });
});

describe("importTeams", () => {
  it("adds every team, with its name history, and logs each one", async () => {
    const result = await importTeams(db, actor, { today, csv: `${head}\nT074,Payments Core,Platform,,\nT075,Imaging Viewer,Radiology,,\n` });
    expect(result).toEqual({ ok: true, count: 2, warnings: [] });
    expect((await db.select().from(t.teams)).map((x) => x.id).sort()).toEqual(["T017", "T074", "T075"]);
    expect(await db.select().from(t.teamNameHistory)).toHaveLength(2);
    expect((await db.select().from(t.auditLog)).filter((a) => a.action === "add")).toHaveLength(2);
  });

  it("new teams adopt the project's standard allocation", async () => {
    await saveStandardAllocation(db, actor, { overhead: 0.2, contingency: 0, split: { run: 0.2, fix: 0.2, sustain: 0.2, change: 0.2, enabling: 0 } });
    await importTeams(db, actor, { today, csv: `${head}\nT074,Payments Core,Platform,,\n` });
    const { current } = await getTeamDefaults(db, { teamId: "T074", today });
    expect(current).toMatchObject({ status: "Active", overhead: 0.2 });
  });

  it("refuses IDs or names already in the project, and adds nothing", async () => {
    const result = await importTeams(db, actor, { today, csv: `${head}\nT074,New,Platform,,\nT017,Other,,,\nT075,drgw,Platform,,\n` });
    expect(result).toEqual({ ok: false, errors: ["Line 3: Team ID T017 is already used", 'Line 4: "drgw" is already a team in Platform'] });
    expect(await db.select().from(t.teams)).toHaveLength(1);
  });

  it("reads an optional base_location column (sean, 15 Nov 2026)", async () => {
    await db.insert(t.locations).values({ code: "DE-BY", country: "DE", name: "Bavaria" });
    const csv = "team_id,name,base_location\nT074,Payments Core,DE-BY\nT075,Imaging Viewer,\n";
    expect(await importTeams(db, actor, { today, csv })).toMatchObject({ ok: true, count: 2 });
    const teams = await db.select().from(t.teams);
    expect(teams.find((x) => x.id === "T074")?.baseLocation).toBe("DE-BY");
    expect(teams.find((x) => x.id === "T075")?.baseLocation).toBeNull();
  });

  it("refuses a base location the project doesn't have, and adds nothing", async () => {
    const result = await importTeams(db, actor, { today, csv: "team_id,name,base_location\nT074,Payments Core,XX-YY\n" });
    expect(result).toEqual({ ok: false, errors: ["Line 2: Unknown base location XX-YY"] });
    expect(await db.select().from(t.teams)).toHaveLength(1);
  });

  it("passes on file problems", async () => {
    expect(await importTeams(db, actor, { today, csv: "nothing useful" })).toMatchObject({ ok: false });
  });

  it("warns, but still imports, when a name is used in another value stream", async () => {
    const result = await importTeams(db, actor, { today, csv: `${head}\nT074,DRGW,Radiology,,\n` });
    expect(result).toEqual({ ok: true, count: 1, warnings: ['Line 2: "DRGW" is also a team in Platform'] });
  });
});
