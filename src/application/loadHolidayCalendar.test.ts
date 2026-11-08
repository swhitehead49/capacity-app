import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { OpenHolidaysEntry } from "../domain/holidays/openHolidays";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { listHolidayCalendars, loadHolidayCalendar } from "./loadHolidayCalendar";

// FR-20 / BR-10: the Capacity Admin loads a country's public holidays for a year from OpenHolidays.

const de2026: OpenHolidaysEntry[] = JSON.parse(readFileSync("tests/fixtures/openholidays/DE-2026.json", "utf8"));
const actor = "Capacity Admin";
const fromApi = (entries: OpenHolidaysEntry[]) => async () => entries;
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
});

const holidaysFor = (country: string) =>
  db.select().from(t.publicHolidays).where(eq(t.publicHolidays.country, country));

describe("loadHolidayCalendar", () => {
  it("saves every holiday and marks the calendar as loaded", async () => {
    const result = await loadHolidayCalendar(db, actor, { country: "DE", year: 2026, fetchEntries: fromApi(de2026) });
    expect(result).toEqual({ ok: true, count: 20 });
    expect(await holidaysFor("DE")).toHaveLength(20);
    const [calendar] = await db.select().from(t.holidayCalendars);
    expect(calendar).toMatchObject({ country: "DE", year: 2026, source: "OpenHolidays API" });
  });

  it("loading again replaces that year instead of doubling it", async () => {
    await loadHolidayCalendar(db, actor, { country: "DE", year: 2026, fetchEntries: fromApi(de2026) });
    await loadHolidayCalendar(db, actor, { country: "DE", year: 2026, fetchEntries: fromApi(de2026) });
    expect(await holidaysFor("DE")).toHaveLength(20);
    expect(await db.select().from(t.holidayCalendars)).toHaveLength(1);
  });

  it("leaves other years and other countries alone", async () => {
    await db.insert(t.publicHolidays).values([
      { date: "2025-12-25", country: "DE", regions: [], name: "Christmas Day" },
      { date: "2026-07-14", country: "FR", regions: [], name: "Bastille Day" },
    ]);
    await loadHolidayCalendar(db, actor, { country: "DE", year: 2026, fetchEntries: fromApi(de2026) });
    expect(await holidaysFor("DE")).toHaveLength(21);
    expect(await holidaysFor("FR")).toHaveLength(1);
  });

  it("writes the load to the audit log with before and after counts", async () => {
    await loadHolidayCalendar(db, actor, { country: "DE", year: 2026, fetchEntries: fromApi(de2026) });
    const [entry] = await db.select().from(t.auditLog);
    expect(entry).toMatchObject({
      actor, entity: "holiday_calendars", entityId: "DE:2026", action: "load",
      before: { holidays: 0 }, after: { holidays: 20 },
    });
  });

  it("if the API fails, nothing changes and the error is shown", async () => {
    await db.insert(t.publicHolidays).values({ date: "2026-12-25", country: "DE", regions: [], name: "Christmas Day" });
    const failing = async () => { throw new Error("OpenHolidays API answered 503 for DE 2026"); };
    const result = await loadHolidayCalendar(db, actor, { country: "DE", year: 2026, fetchEntries: failing });
    expect(result).toEqual({ ok: false, errors: ["OpenHolidays API answered 503 for DE 2026"] });
    expect(await holidaysFor("DE")).toHaveLength(1);
    expect(await db.select().from(t.holidayCalendars)).toHaveLength(0);
  });

  it("refuses an empty answer rather than wiping the year", async () => {
    const result = await loadHolidayCalendar(db, actor, { country: "DE", year: 2026, fetchEntries: fromApi([]) });
    expect(result).toEqual({ ok: false, errors: ["OpenHolidays sent no public holidays for DE 2026"] });
  });

  it("only accepts the countries OpenHolidays covers for us", async () => {
    const result = await loadHolidayCalendar(db, actor, { country: "IN", year: 2026, fetchEntries: fromApi(de2026) });
    expect(result).toEqual({ ok: false, errors: ["IN is not loaded from OpenHolidays (India uses the yearly CSV upload)"] });
  });

  it("only accepts a sensible year", async () => {
    const result = await loadHolidayCalendar(db, actor, { country: "DE", year: 1999, fetchEntries: fromApi(de2026) });
    expect(result).toEqual({ ok: false, errors: ["Year must be between 2020 and 2100"] });
  });
});

describe("listHolidayCalendars", () => {
  beforeEach(async () => {
    await db.insert(t.locations).values([
      { code: "DE-BY", country: "DE", name: "Bavaria" },
      { code: "AT-9", country: "AT", name: "Vienna" },
      { code: "IN-KA", country: "IN", name: "Bangalore" },
    ]);
  });

  it("lists loaded calendars with how many holidays each has", async () => {
    await loadHolidayCalendar(db, actor, { country: "DE", year: 2026, fetchEntries: fromApi(de2026) });
    const { loaded } = await listHolidayCalendars(db, "2026-11-08");
    expect(loaded).toEqual([expect.objectContaining({ country: "DE", year: 2026, source: "OpenHolidays API", holidays: 20 })]);
  });

  it("lists calendars still missing for this year and next, for every country we have people in", async () => {
    await loadHolidayCalendar(db, actor, { country: "DE", year: 2026, fetchEntries: fromApi(de2026) });
    const { missing } = await listHolidayCalendars(db, "2026-11-08");
    expect(missing).toEqual([
      { country: "AT", year: 2026, how: "OpenHolidays" },
      { country: "AT", year: 2027, how: "OpenHolidays" },
      { country: "DE", year: 2027, how: "OpenHolidays" },
      { country: "IN", year: 2026, how: "CSV upload" },
      { country: "IN", year: 2027, how: "CSV upload" },
    ]);
  });
});

