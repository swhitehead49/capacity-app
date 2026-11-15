import { beforeEach, describe, expect, it } from "vitest";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { addLocation, addValueStream, getReferenceData, syncLocations } from "./referenceData";

// Reference data set once at system level and used by every project (sean, 15 Nov 2026):
// the value streams and the locations a team's Value stream and Base location are picked from.

const actor = "Capacity Admin";
let shared: Db;

beforeEach(async () => {
  shared = await createTestDb();
});

describe("value streams", () => {
  it("adds a value stream and logs it", async () => {
    expect(await addValueStream(shared, actor, { name: " Platform " })).toEqual({ ok: true });
    expect((await getReferenceData(shared)).valueStreams).toEqual(["Platform"]);
    expect((await shared.select().from(t.auditLog))[0]).toMatchObject({ entity: "value_streams", entityId: "Platform", action: "add" });
  });

  it("lists them in alphabetical order", async () => {
    await addValueStream(shared, actor, { name: "Radiology" });
    await addValueStream(shared, actor, { name: "Clinical" });
    expect((await getReferenceData(shared)).valueStreams).toEqual(["Clinical", "Radiology"]);
  });

  it("refuses a blank name or one already there (ignoring capitals)", async () => {
    await addValueStream(shared, actor, { name: "Platform" });
    expect(await addValueStream(shared, actor, { name: "  " })).toEqual({ ok: false, errors: ["Value stream name is needed"] });
    expect(await addValueStream(shared, actor, { name: "platform" })).toEqual({ ok: false, errors: ['"platform" is already a value stream'] });
  });
});

describe("locations", () => {
  const bavaria = { code: "de-by", country: "de", name: "Bavaria", standardHours: "40" };

  it("adds a location (code in capitals) and logs it", async () => {
    expect(await addLocation(shared, actor, bavaria)).toEqual({ ok: true });
    expect((await getReferenceData(shared)).locations).toEqual([{ code: "DE-BY", country: "DE", name: "Bavaria", standardHours: 40 }]);
    expect((await shared.select().from(t.auditLog))[0]).toMatchObject({ entity: "locations", entityId: "DE-BY", action: "add" });
  });

  it("checks the code, country and hours", async () => {
    expect(await addLocation(shared, actor, { code: "Bavaria", country: "Germany", name: "", standardHours: "-1" })).toEqual({ ok: false, errors: [
      "Code must be a country code with an optional region, such as DE or DE-BY",
      "Country must be a 2-letter country code, such as DE",
      "Name is needed",
      "Standard hours must be a number above 0, or blank",
    ] });
    expect(await addLocation(shared, actor, { ...bavaria, country: "AT" })).toEqual({ ok: false, errors: ["The code DE-BY doesn't start with the country AT"] });
  });

  it("refuses a code already there", async () => {
    await addLocation(shared, actor, bavaria);
    expect(await addLocation(shared, actor, bavaria)).toEqual({ ok: false, errors: ["DE-BY is already a location"] });
  });
});

describe("syncLocations", () => {
  it("copies the system's locations into a project, so its teams and people can use them", async () => {
    const project = await createTestDb();
    await project.insert(t.locations).values({ code: "IN-KA", country: "IN", name: "Bangalore (old name)" });
    await addLocation(shared, actor, { code: "DE-BY", country: "DE", name: "Bavaria", standardHours: "40" });
    await addLocation(shared, actor, { code: "IN-KA", country: "IN", name: "Bangalore", standardHours: "" });
    await syncLocations(project, shared);
    expect((await project.select().from(t.locations)).map((l) => [l.code, l.name]).sort()).toEqual([["DE-BY", "Bavaria"], ["IN-KA", "Bangalore"]]);
  });

  it("does nothing for the Default project, which holds the system's list itself", async () => {
    await addLocation(shared, actor, { code: "DE-BY", country: "DE", name: "Bavaria", standardHours: "40" });
    await syncLocations(shared, shared);
    expect(await shared.select().from(t.locations)).toHaveLength(1);
  });
});
