import { beforeEach, describe, expect, it } from "vitest";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { STARTING_LOCATIONS, addLocation, updateLocation, addStartingLocations, addValueStream, addValueStreams, getReferenceData, syncLocations } from "./referenceData";

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

describe("updateLocation (sean, 15 Nov 2026: edit a location's name and standard hours)", () => {
  beforeEach(async () => {
    await addLocation(shared, actor, { code: "AT-9", country: "AT", name: "Vienna", standardHours: "" });
  });

  it("changes the name and standard hours, and logs what changed", async () => {
    expect(await updateLocation(shared, actor, { code: "AT-9", name: "Vienna office", standardHours: "38.5" })).toEqual({ ok: true });
    expect((await getReferenceData(shared)).locations).toEqual([{ code: "AT-9", country: "AT", name: "Vienna office", standardHours: 38.5 }]);
    const entry = (await shared.select().from(t.auditLog)).at(-1);
    expect(entry).toMatchObject({ entity: "locations", entityId: "AT-9", action: "change", before: { name: "Vienna", standardHours: null }, after: { name: "Vienna office", standardHours: 38.5 } });
  });

  it("checks the name and hours, and that something changed", async () => {
    expect(await updateLocation(shared, actor, { code: "AT-9", name: " ", standardHours: "0" }))
      .toEqual({ ok: false, errors: ["Name is needed", "Standard hours must be a number above 0, or blank"] });
    expect(await updateLocation(shared, actor, { code: "AT-9", name: "Vienna", standardHours: "" })).toEqual({ ok: false, errors: ["Nothing has changed"] });
    expect(await updateLocation(shared, actor, { code: "XX", name: "X", standardHours: "" })).toEqual({ ok: false, errors: ["Unknown location XX"] });
  });

  it("projects pick up the change", async () => {
    const project = await createTestDb();
    await syncLocations(project, shared);
    await updateLocation(shared, actor, { code: "AT-9", name: "Vienna", standardHours: "40" });
    await syncLocations(project, shared);
    expect((await project.select().from(t.locations))[0]?.standardHours).toBe(40);
  });
});

describe("addStartingLocations (the original workbook's LocationProfiles, as ISO codes)", () => {
  it("adds the ones that are missing and leaves the others alone", async () => {
    await addLocation(shared, actor, { code: "DE-BY", country: "DE", name: "Bayern", standardHours: "38" });
    expect(await addStartingLocations(shared, actor)).toBe(STARTING_LOCATIONS.length - 1);
    const { locations } = await getReferenceData(shared);
    expect(locations.map((l) => l.code)).toEqual(["AT-6", "AT-9", "BE-VOV", "DE-BY", "DE-NI", "DE-RP", "DE-SL", "FR-NAQ", "IN-KA"]);
    expect(locations.find((l) => l.code === "DE-BY")?.name).toBe("Bayern");
    expect(await addStartingLocations(shared, actor)).toBe(0);
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

// sean, 22 Nov 2026: "can you import the list of value streams?" Paste one name per line.
describe("addValueStreams (a pasted list)", () => {
  it("adds each new name once, skips ones already there, and says what it did", async () => {
    await addValueStream(shared, actor, { name: "Connectivity" });
    const result = await addValueStreams(shared, actor, { text: "Clinical Services\n  Medication \nconnectivity\n\nHigh Acuity Care\nHigh Acuity Care\n" });
    expect(result).toEqual({ ok: true, added: ["Clinical Services", "Medication", "High Acuity Care"], skipped: ["connectivity"] });
    expect((await getReferenceData(shared)).valueStreams).toEqual(["Clinical Services", "Connectivity", "High Acuity Care", "Medication"]);
  });

  it("needs at least one name", async () => {
    expect(await addValueStreams(shared, actor, { text: " \n " })).toEqual({ ok: false, errors: ["Paste at least one value stream name"] });
  });
});
