import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as t from "./schema";
import { createTestDb } from "./testDb";
import { ensureProjectRegistry, findProject, listProjects, ProjectDatabases } from "./projectDatabases";

// Projects (decided 15 Nov 2026): each project has its own complete database, so teams, people,
// holidays and plans can never mix. A small list of projects lives next to the Default project's data.

describe("project registry", () => {
  it("always contains the Default project, which holds the data from before projects existed", async () => {
    const db = await createTestDb();
    await ensureProjectRegistry(db);
    await ensureProjectRegistry(db); // safe to run on every start
    expect(await listProjects(db)).toEqual([expect.objectContaining({ id: "default", name: "Default", archivedAt: null })]);
    expect(await findProject(db, "default")).toMatchObject({ name: "Default" });
    expect(await findProject(db, "nope")).toBeNull();
  });
});

describe("ProjectDatabases", () => {
  it("opens each project's database once and reuses it", async () => {
    let opened = 0;
    const dbs = new ProjectDatabases(async () => { opened++; return createTestDb(); });
    const a1 = await dbs.get("alpha");
    const a2 = await dbs.get("alpha");
    expect(a1).toBe(a2);
    expect(opened).toBe(1);
  });

  it("keeps projects apart: a team added in one project is not in another", async () => {
    const dbs = new ProjectDatabases(() => createTestDb());
    await (await dbs.get("alpha")).insert(t.teams).values({ id: "T001", name: "Alpha team" });
    await (await dbs.get("beta")).insert(t.teams).values({ id: "T001", name: "Beta team" }); // same ID is fine
    expect((await (await dbs.get("alpha")).select().from(t.teams)).map((x) => x.name)).toEqual(["Alpha team"]);
    expect((await (await dbs.get("beta")).select().from(t.teams)).map((x) => x.name)).toEqual(["Beta team"]);
  });
});

describe("migrations", () => {
  it("never name the public schema, so the same migrations build every project's tables", () => {
    for (const file of readdirSync("drizzle").filter((f) => f.endsWith(".sql"))) {
      expect(readFileSync(`drizzle/${file}`, "utf8"), file).not.toContain('"public".');
    }
  });
});
