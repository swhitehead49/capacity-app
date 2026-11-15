import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { ensureProjectRegistry, findProject, listProjects } from "../infrastructure/db/projectDatabases";
import * as t from "../infrastructure/db/schema";
import { archiveProject, createProject, renameProject, restoreProject } from "./projects";

// Projects, step 4 (sean, 15 Nov 2026): create, rename, archive and restore projects. Nothing is ever deleted.
// `db` is the Default project's database, which holds the list of projects.

const actor = "Capacity Admin";
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await ensureProjectRegistry(db);
});

describe("createProject", () => {
  it("adds a project from its name, makes its ID, and logs it", async () => {
    expect(await createProject(db, actor, { name: "Cardiology Team" })).toEqual({ ok: true, id: "cardiology-team" });
    expect(await findProject(db, "cardiology-team")).toMatchObject({ name: "Cardiology Team", archivedAt: null });
    expect((await db.select().from(t.auditLog)).filter((a) => a.entity === "projects")).toHaveLength(1);
  });

  it("needs a name, and refuses one that is already used", async () => {
    expect(await createProject(db, actor, { name: "  " })).toEqual({ ok: false, errors: ["Project name is needed"] });
    expect(await createProject(db, actor, { name: "default" })).toEqual({ ok: false, errors: ['There is already a project called "Default"'] });
  });
});

describe("renameProject", () => {
  it("changes the name but keeps the ID, so web addresses still work", async () => {
    await createProject(db, actor, { name: "Imaging" });
    expect(await renameProject(db, actor, { id: "imaging", name: "Diagnostic Imaging" })).toEqual({ ok: true, id: "imaging" });
    expect(await findProject(db, "imaging")).toMatchObject({ id: "imaging", name: "Diagnostic Imaging" });
  });

  it("refuses a blank name or one another project has", async () => {
    await createProject(db, actor, { name: "Imaging" });
    expect(await renameProject(db, actor, { id: "imaging", name: "" })).toEqual({ ok: false, errors: ["Project name is needed"] });
    expect(await renameProject(db, actor, { id: "imaging", name: "DEFAULT" })).toEqual({ ok: false, errors: ['There is already a project called "Default"'] });
  });
});

describe("archiveProject and restoreProject", () => {
  it("archiving hides a project from the picker but keeps it; restoring brings it back", async () => {
    await createProject(db, actor, { name: "Imaging" });
    expect(await archiveProject(db, actor, { id: "imaging" })).toEqual({ ok: true, id: "imaging" });
    expect((await findProject(db, "imaging"))?.archivedAt).toBeInstanceOf(Date);
    expect(await listProjects(db)).toHaveLength(2);
    expect(await restoreProject(db, actor, { id: "imaging" })).toEqual({ ok: true, id: "imaging" });
    expect((await findProject(db, "imaging"))?.archivedAt).toBeNull();
  });

  it("the Default project can't be archived", async () => {
    expect(await archiveProject(db, actor, { id: "default" })).toEqual({ ok: false, errors: ["The Default project can't be archived"] });
  });
});
