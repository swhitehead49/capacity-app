import { beforeEach, describe, expect, it } from "vitest";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { getSprintCalendar, setUpSprintCalendar } from "./sprintCalendar";

// The sprint calendar tab in Reference data (sean, 15 Nov 2026). One calendar, shared by all projects.
// It can be set up once; after that it is shown read-only, because sprints already created never change.

const actor = "Capacity Admin";
const today = "2026-11-15";
const setup = { firstSprintStart: "2026-10-26", sprintLengthDays: "14", sprintPrefix: "S" };
let shared: Db;

beforeEach(async () => {
  shared = await createTestDb();
});

describe("getSprintCalendar", () => {
  it("is not set up yet on a fresh system", async () => {
    expect(await getSprintCalendar(shared, today)).toEqual({ settings: null, sprints: [], quarters: [], canChange: true });
  });

  it("shows the settings and the sprints and quarters they give", async () => {
    await setUpSprintCalendar(shared, actor, setup, today);
    const view = await getSprintCalendar(shared, today);
    expect(view.settings).toEqual({ firstSprintStart: "2026-10-26", sprintLengthDays: 14, sprintPrefix: "S" });
    expect(view.sprints[0]).toMatchObject({ id: "S001", start: "2026-10-26", end: "2026-11-08", current: false });
    expect(view.sprints[1]).toMatchObject({ id: "S002", start: "2026-11-09", current: true });
    expect(view.quarters[0]).toMatchObject({ id: "2026-Q4" });
  });
});

describe("setUpSprintCalendar", () => {
  it("saves the calendar and logs it", async () => {
    expect(await setUpSprintCalendar(shared, actor, setup, today)).toEqual({ ok: true });
    expect((await shared.select().from(t.auditLog))[0]).toMatchObject({ entity: "timeline_settings", action: "add" });
  });

  it("checks the start date, length and prefix", async () => {
    expect(await setUpSprintCalendar(shared, actor, { firstSprintStart: "2026-02-30", sprintLengthDays: "0", sprintPrefix: "1 x" }, today)).toEqual({
      ok: false, errors: ["First sprint start must be a real date", "Sprint length must be a whole number of days from 1 to 42", "Sprint prefix must be 1 to 5 letters"],
    });
  });

  it("can't be changed once set up, since existing sprints never change", async () => {
    await setUpSprintCalendar(shared, actor, setup, today);
    expect(await setUpSprintCalendar(shared, actor, { ...setup, sprintLengthDays: "21" }, today))
      .toEqual({ ok: false, errors: ["The sprint calendar is already set up"] });
    expect((await getSprintCalendar(shared, today)).canChange).toBe(false);
  });
});
