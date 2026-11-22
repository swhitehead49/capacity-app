import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { getTeamDefaults } from "./getTeamDefaults";
import { deleteMasterTeam, deleteProvisionalTeams, purgeTeam, purgePreview, retireMasterTeam, saveMasterTeamRows, syncTeams } from "./masterTeams";
import { saveStandardAllocation } from "./standardAllocation";
import { addTeam, changeValueStream, renameTeam, updateTeamDetails } from "./teams";

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
    expect(await copy("T1")).toMatchObject({ name: "Viewer", valueStream: "Radiology", baseLocation: "DE" });
    expect(await project.select().from(t.teamNameHistory).where(eq(t.teamNameHistory.teamId, "T1")))
      .toMatchObject([{ name: "Viewer", effectiveFrom: "2026-11-02" }]);
  });

  it("a team without a value stream starts excluded, so it doesn't join every project", async () => {
    await syncTeams(project, shared, today);
    expect(await copy("T2")).toMatchObject({ included: false });
  });

  it("FR-18s: a new copy is ticked only if the project has its value stream", async () => {
    await project.insert(t.projectValueStreams).values({ name: "Radiology" });
    await addTeam(shared, actor, { id: "T3", name: "Orders", valueStream: "Clinical", leadEmail: null, effectiveFrom: "2026-11-02" });
    await syncTeams(project, shared, today);
    expect([(await copy("T1"))?.included, (await copy("T3"))?.included]).toEqual([true, false]);
  });

  it("FR-18s: when the Admin moves a team to another value stream, each project re-applies its value stream ticks", async () => {
    await project.insert(t.projectValueStreams).values({ name: "Clinical" });
    await syncTeams(project, shared, today);
    expect((await copy("T1"))?.included).toBe(false); // Radiology isn't in the project
    await changeValueStream(shared, actor, { teamId: "T1", valueStream: "Clinical" }, shared);
    await syncTeams(project, shared, today);
    expect((await copy("T1"))?.included).toBe(true);
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
    await updateTeamDetails(shared, actor, { ...(await shared.query.teams.findFirst({ where: eq(t.teams.id, "T2") }))!, teamId: "T2", topLevelGroup: "ORBIS", teamType: "Domain Team", teamLeadFirstName: "Ada" });
    await syncTeams(project, shared, today);
    expect(await copy("T2")).toMatchObject({ name: "Billing", topLevelGroup: "ORBIS", teamType: "Domain Team", teamLeadFirstName: "Ada", included: true, retiredOn: "2026-12-31" });
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

// sean, 16 Nov 2026: while the team list is provisional, a team can be deleted, as long as nothing uses it yet.
describe("deleteMasterTeam", () => {
  it("deletes a Provisional team from the master list and every project, and logs it", async () => {
    await syncTeams(project, shared, today);
    expect(await deleteMasterTeam(shared, [project], actor, { teamId: "T2" })).toEqual({ ok: true });
    expect(await shared.query.teams.findFirst({ where: eq(t.teams.id, "T2") })).toBeUndefined();
    expect(await copy("T2")).toBeUndefined();
    await syncTeams(project, shared, today); // it doesn't come back
    expect(await shared.query.teams.findFirst({ where: eq(t.teams.id, "T2") })).toBeUndefined();
    expect((await shared.select().from(t.auditLog)).at(-1)).toMatchObject({ entity: "teams", entityId: "T2", action: "delete" });
  });

  it("refuses a Confirmed team", async () => {
    await shared.update(t.teams).set({ idStatus: "Confirmed" }).where(eq(t.teams.id, "T2"));
    expect(await deleteMasterTeam(shared, [project], actor, { teamId: "T2" }))
      .toEqual({ ok: false, errors: ["T2 is Confirmed, so it can't be deleted: retire it instead"] });
  });

  it("refuses a team that a project already uses (members or allocation changes)", async () => {
    await syncTeams(project, shared, today);
    await project.insert(t.allocationSettings).values({
      teamId: "T2", level: "Team default", status: "Draft", effectiveFrom: null, overhead: null, run: 0, fix: 0, sustain: 0, change: 0, owner: actor,
    });
    expect(await deleteMasterTeam(shared, [project], actor, { teamId: "T2" }))
      .toEqual({ ok: false, errors: ["T2 is already used in a project (members, leave or allocation changes): retire it instead"] });
  });
});

// FR-18q (sean, 22 Nov 2026): clear out the whole provisional list at once.
describe("deleteProvisionalTeams", () => {
  it("deletes every unused Provisional team everywhere; keeps Confirmed and used ones, saying why", async () => {
    await addTeam(shared, actor, { id: "T3", name: "Viewer", valueStream: "Clinical", leadEmail: null, effectiveFrom: "2026-11-02" });
    await shared.update(t.teams).set({ idStatus: "Confirmed" }).where(eq(t.teams.id, "T1"));
    await syncTeams(project, shared, today);
    await project.insert(t.allocationSettings).values({
      teamId: "T3", level: "Team default", status: "Draft", effectiveFrom: null, overhead: null, run: 0, fix: 0, sustain: 0, change: 0, owner: actor,
    });
    expect(await deleteProvisionalTeams(shared, [project], actor)).toEqual({
      deleted: ["T2"],
      kept: ["T3: already used in a project (members, leave or allocation changes), so retire it instead"],
    });
    expect((await shared.select().from(t.teams)).map((x) => x.id).sort()).toEqual(["T1", "T3"]);
    expect(await copy("T2")).toBeUndefined();
  });
});

// sean, 16 Nov 2026: edit the master list's core values in its table, saved together.
describe("saveMasterTeamRows", () => {
  it("saves only what changed on each row, and reports problems by team", async () => {
    const result = await saveMasterTeamRows(shared, actor, today, [
      { teamId: "T1", name: "Viewer", valueStream: "Clinical", baseLocation: "", leadEmail: "lead@example.com", idStatus: "Provisional", teamType: "Mission Team" },
      { teamId: "T2", name: "Billing", valueStream: "", baseLocation: "", leadEmail: "", idStatus: "Confirmed", teamType: "" },
    ]);
    expect(result).toEqual({ ok: true, changed: 2 });
    expect(await shared.query.teams.findFirst({ where: eq(t.teams.id, "T1") }))
      .toMatchObject({ valueStream: "Clinical", baseLocation: null, leadEmail: "lead@example.com", teamType: "Mission Team" });
    expect(await shared.query.teams.findFirst({ where: eq(t.teams.id, "T2") })).toMatchObject({ name: "Billing", idStatus: "Confirmed" });
  });

  it("a row without a lead email (the table no longer shows it) keeps the team's email", async () => {
    await saveMasterTeamRows(shared, actor, today, [
      { teamId: "T1", name: "Viewer", valueStream: "Radiology", baseLocation: "DE", leadEmail: "lead@example.com", idStatus: "Provisional", teamType: "" },
    ]);
    expect(await saveMasterTeamRows(shared, actor, today, [
      { teamId: "T1", name: "Viewer", valueStream: "Radiology", baseLocation: "DE", idStatus: "Provisional", teamType: "Domain Team" },
    ])).toEqual({ ok: true, changed: 1 });
    expect(await shared.query.teams.findFirst({ where: eq(t.teams.id, "T1") })).toMatchObject({ leadEmail: "lead@example.com", teamType: "Domain Team" });
  });

  it("sean, 22 Nov 2026: saves the parent and grandparent team names typed in the table", async () => {
    expect(await saveMasterTeamRows(shared, actor, today, [
      { teamId: "T1", name: "Viewer", valueStream: "Radiology", baseLocation: "DE", idStatus: "Provisional", teamType: "",
        parentTeamName: " High Acuity Care ", grandparentTeamName: "ORBIS Engineering Vienna" },
    ])).toEqual({ ok: true, changed: 1 });
    expect(await shared.query.teams.findFirst({ where: eq(t.teams.id, "T1") }))
      .toMatchObject({ parentTeamName: "High Acuity Care", grandparentTeamName: "ORBIS Engineering Vienna" });
    await saveMasterTeamRows(shared, actor, today, [
      { teamId: "T1", name: "Viewer", valueStream: "Radiology", baseLocation: "DE", idStatus: "Provisional", teamType: "", parentTeamName: "" },
    ]);
    expect(await shared.query.teams.findFirst({ where: eq(t.teams.id, "T1") }))
      .toMatchObject({ parentTeamName: null, grandparentTeamName: "ORBIS Engineering Vienna" }); // left out = kept
  });

  it("FR-18o: refuses an unknown team type", async () => {
    const result = await saveMasterTeamRows(shared, actor, today, [
      { teamId: "T1", name: "Viewer", valueStream: "Radiology", baseLocation: "DE", leadEmail: "", idStatus: "Provisional", teamType: "Squad" },
    ]);
    expect(result).toEqual({ ok: false, changed: 0, errors: ["T1: Team type must be Mission Team, Domain Team or Enabling Team"] });
  });

  it("reports a problem with the team's ID, and saves the other rows", async () => {
    const result = await saveMasterTeamRows(shared, actor, today, [
      { teamId: "T1", name: "Viewer", valueStream: "Nowhere", baseLocation: "DE", leadEmail: "", idStatus: "Provisional", teamType: "" },
      { teamId: "T2", name: "Payments", valueStream: "Radiology", baseLocation: "", leadEmail: "", idStatus: "Provisional", teamType: "" },
    ]);
    expect(result).toEqual({ ok: false, changed: 1, errors: ["T1: Unknown value stream Nowhere: add it under Reference data first"] });
  });
});

// sean, 16 Nov 2026: retiring is done once, in the master list, for every project.
describe("retireMasterTeam", () => {
  const projects = () => [{ name: "Imaging", db: project }];

  it("retires the team in the master list and in every project, with its successor", async () => {
    expect(await retireMasterTeam(shared, projects(), actor, today, { teamId: "T2", retiredOn: "2026-12-31", successorTeamIds: ["T1"] }))
      .toEqual({ ok: true });
    expect(await shared.query.teams.findFirst({ where: eq(t.teams.id, "T2") })).toMatchObject({ retiredOn: "2026-12-31" });
    expect(await copy("T2")).toMatchObject({ retiredOn: "2026-12-31" });
    expect(await project.select().from(t.teamSuccessors)).toEqual([{ teamId: "T2", successorTeamId: "T1" }]);
  });

  it("first lists anyone still on the team in any project, and retires nothing", async () => {
    await syncTeams(project, shared, today);
    await project.insert(t.people).values({ email: "a@example.com" });
    await project.insert(t.assignments).values({ personEmail: "a@example.com", teamId: "T2", startDate: "2026-11-01" });
    expect(await retireMasterTeam(shared, projects(), actor, today, { teamId: "T2", retiredOn: "2026-12-31", successorTeamIds: [] }))
      .toEqual({ ok: false, errors: ["Move or end these members first: a@example.com (Imaging)"] });
    expect(await shared.query.teams.findFirst({ where: eq(t.teams.id, "T2") })).toMatchObject({ retiredOn: null });
  });

  it("a project opened later gets the team as retired", async () => {
    await retireMasterTeam(shared, [], actor, today, { teamId: "T2", retiredOn: "2026-12-31", successorTeamIds: [] });
    await syncTeams(project, shared, today);
    expect(await copy("T2")).toMatchObject({ retiredOn: "2026-12-31" });
  });
});

// sean, 16 Nov 2026: "hard delete of team DRGW and all associated data". Any status, everywhere, after typing the ID.
describe("purgeTeam", () => {
  const projects = () => [{ name: "Imaging", db: project }];
  beforeEach(async () => {
    await syncTeams(project, shared, today);
    await project.insert(t.people).values([{ email: "only@example.com" }, { email: "both@example.com" }]);
    await project.insert(t.assignments).values([
      { personEmail: "only@example.com", teamId: "T2", startDate: "2026-11-01" },
      { personEmail: "both@example.com", teamId: "T2", startDate: "2026-11-01" },
      { personEmail: "both@example.com", teamId: "T1", startDate: "2026-11-01" },
    ]);
    await project.insert(t.absences).values({ personEmail: "only@example.com", startDate: "2026-12-01", endDate: "2026-12-02", type: "Annual" });
    await retireMasterTeam(shared, [], actor, today, { teamId: "T1", retiredOn: "2027-12-31", successorTeamIds: ["T2"] });
  });

  it("shows what will be deleted in each project", async () => {
    expect(await purgePreview(shared, projects(), "T2")).toEqual([
      { project: "Default", memberships: 0, people: 0, settings: 1 },
      { project: "Imaging", memberships: 2, people: 1, settings: 1 },
    ]);
  });

  it("needs the team ID typed to confirm", async () => {
    expect(await purgeTeam(shared, projects(), actor, { teamId: "T2", confirm: "t3" }))
      .toEqual({ ok: false, errors: ["Type T2 to confirm"] });
  });

  it("deletes the team and everything that belongs only to it, everywhere, and logs it", async () => {
    expect(await purgeTeam(shared, projects(), actor, { teamId: "T2", confirm: "T2" })).toEqual({ ok: true });
    for (const db of [shared, project]) {
      expect(await db.query.teams.findFirst({ where: eq(t.teams.id, "T2") })).toBeUndefined();
      expect(await db.select().from(t.teamSuccessors)).toEqual([]);
    }
    expect((await project.select().from(t.people)).map((p) => p.email)).toEqual(["both@example.com"]);
    expect(await project.select().from(t.absences)).toEqual([]);
    expect((await project.select().from(t.assignments)).map((a) => a.teamId)).toEqual(["T1"]);
    expect((await shared.select().from(t.auditLog)).at(-1)).toMatchObject({ entity: "teams", entityId: "T2", action: "delete with all its data" });
    await syncTeams(project, shared, today); // it doesn't come back
    expect(await shared.query.teams.findFirst({ where: eq(t.teams.id, "T2") })).toBeUndefined();
  });
});
