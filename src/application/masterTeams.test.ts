import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { getTeamDefaults } from "./getTeamDefaults";
import { syncTeams } from "./masterTeams";
import { saveStandardAllocation } from "./standardAllocation";
import { addTeam, renameTeam, updateTeamDetails } from "./teams";

// Master team list (sean, 15 Nov 2026): the Admin keeps every team once, in Reference data → Teams (the shared database).
// Each project gets a copy of every team, kept up to date, so its members, allocations and plans can refer to it.
// The project decides which teams are in it (through its value streams); its own allocations and plans stay its own.

const actor = "Capacity Admin";
const today = "2026-11-15";
const standard = { overhead: 0.2, contingency: 0, split: { run: 0.2, fix: 0.2, sustain: 0.2, change: 0.2, enabling: 0 } };
let shared: Db;
let project: Db;

beforeEach(async () => {
  shared = await createTestDb();
  project = await createTestDb();
  await shared.insert(t.valueStreams).values([{ name: "Radiology" }, { name: "Clinical" }]);
  await shared.insert(t.locations).values({ code: "DE-BY", country: "DE", name: "Bavaria", standardHours: 40 });
  await addTeam(shared, actor, { id: "T1", name: "Viewer", valueStream: "Radiology", leadEmail: null, baseLocation: "DE-BY", effectiveFrom: "2026-11-02" });
  await addTeam(shared, actor, { id: "T2", name: "Payments", valueStream: null, leadEmail: null, effectiveFrom: "2026-11-02" });
});

const copy = (id: string) => project.query.teams.findFirst({ where: eq(t.teams.id, id) });

describe("syncTeams", () => {
  it("copies every master team into the project, with its name history", async () => {
    await syncTeams(project, shared, today);
    expect(await copy("T1")).toMatchObject({ name: "Viewer", valueStream: "Radiology", baseLocation: "DE-BY" });
    expect(await project.select().from(t.teamNameHistory).where(eq(t.teamNameHistory.teamId, "T1")))
      .toMatchObject([{ name: "Viewer", effectiveFrom: "2026-11-02" }]);
  });

  it("a team without a value stream starts excluded, so it doesn't join every project", async () => {
    await syncTeams(project, shared, today);
    expect(await copy("T2")).toMatchObject({ included: false });
  });

  it("a new copy starts with the project's standard allocation, or a Draft default", async () => {
    await saveStandardAllocation(project, actor, standard);
    await syncTeams(project, shared, today);
    expect((await getTeamDefaults(project, { teamId: "T1", today })).current)
      .toMatchObject({ status: "Active", effectiveFrom: "2026-11-02", overhead: 0.2 });

    const other = await createTestDb();
    await syncTeams(other, shared, today);
    expect((await getTeamDefaults(other, { teamId: "T1", today })).current).toBeNull();
  });

  it("passes on the Admin's changes, but keeps what the project decided (included, retired)", async () => {
    await syncTeams(project, shared, today);
    await project.update(t.teams).set({ included: true, retiredOn: "2026-12-31" }).where(eq(t.teams.id, "T2"));
    await renameTeam(shared, actor, { teamId: "T2", name: "Billing", effectiveFrom: "2026-12-01" });
    await updateTeamDetails(shared, actor, { ...(await shared.query.teams.findFirst({ where: eq(t.teams.id, "T2") }))!, teamId: "T2", topLevelGroup: "ORBIS" });
    await syncTeams(project, shared, today);
    expect(await copy("T2")).toMatchObject({ name: "Billing", topLevelGroup: "ORBIS", included: true, retiredOn: "2026-12-31" });
    expect((await project.select().from(t.teamNameHistory).where(eq(t.teamNameHistory.teamId, "T2"))).map((n) => n.name).sort())
      .toEqual(["Billing", "Payments"]);
  });

  it("a team that so far only exists in the project joins the master list (left out of other projects)", async () => {
    await project.insert(t.teams).values({ id: "T9", name: "Imaging Core", valueStream: null });
    await project.insert(t.teamNameHistory).values({ teamId: "T9", name: "Imaging Core", effectiveFrom: "2026-10-01" });
    await syncTeams(project, shared, today);
    expect(await shared.query.teams.findFirst({ where: eq(t.teams.id, "T9") })).toMatchObject({ name: "Imaging Core", included: false });
    expect(await copy("T9")).toMatchObject({ name: "Imaging Core", included: true });
    expect((await shared.select().from(t.auditLog)).at(-1)).toMatchObject({ entity: "teams", entityId: "T9", action: "add to master list" });
  });

  it("does nothing for the Default project, whose teams are the master list", async () => {
    await syncTeams(shared, shared, today);
    expect((await shared.select().from(t.teams)).map((x) => x.id)).toEqual(["T1", "T2"]);
  });
});
