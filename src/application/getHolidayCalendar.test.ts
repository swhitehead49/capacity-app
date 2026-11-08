import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { getHolidayCalendar } from "./getHolidayCalendar";
import { loadHolidayCalendar } from "./loadHolidayCalendar";

// FR-20 / UC10 (requested 8 Nov 2026): view a loaded holiday calendar, optionally for one region.

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await db.insert(t.locations).values([
    { code: "DE-BY", country: "DE", name: "Bavaria" },
    { code: "DE-NI", country: "DE", name: "Lower Saxony" },
  ]);
  const de2026 = JSON.parse(readFileSync("tests/fixtures/openholidays/DE-2026.json", "utf8"));
  await loadHolidayCalendar(db, "Capacity Admin", { country: "DE", year: 2026, fetchEntries: async () => de2026 });
});

describe("getHolidayCalendar", () => {
  it("lists every holiday in date order, with its weekday and where it applies", async () => {
    const view = await getHolidayCalendar(db, { country: "DE", year: 2026 });
    expect(view.calendar).toMatchObject({ country: "DE", year: 2026, source: "OpenHolidays API" });
    expect(view.holidays).toHaveLength(20);
    expect(view.holidays[0]).toEqual({ date: "2026-01-01", weekday: "Thu", name: "New Year's Day", regions: [], isWeekday: true });
    expect(view.holidays.find((h) => h.date === "2026-11-01")).toMatchObject({ weekday: "Sun", isWeekday: false });
  });

  it("can show only the holidays that apply in one region", async () => {
    const view = await getHolidayCalendar(db, { country: "DE", year: 2026, region: "DE-NI" });
    const names = view.holidays.map((h) => h.name);
    expect(names).toContain("Reformation Day");
    expect(names).not.toContain("Corpus Christi");
    expect(view.weekdayCount).toBe(view.holidays.filter((h) => h.isWeekday).length);
  });

  it("offers the regions we have offices in as filters", async () => {
    const view = await getHolidayCalendar(db, { country: "DE", year: 2026 });
    expect(view.regions).toEqual([{ code: "DE-BY", name: "Bavaria" }, { code: "DE-NI", name: "Lower Saxony" }]);
  });

  it("a calendar that isn't loaded is reported as missing", async () => {
    const view = await getHolidayCalendar(db, { country: "FR", year: 2026 });
    expect(view.calendar).toBeNull();
    expect(view.holidays).toEqual([]);
  });
});
