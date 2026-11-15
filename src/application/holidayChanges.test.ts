import { readFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { OpenHolidaysEntry } from "../domain/holidays/openHolidays";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { getHolidayCalendar } from "./getHolidayCalendar";
import { addPublicHoliday, putBackPublicHoliday, removePublicHoliday } from "./holidayChanges";
import { loadHolidayCalendar } from "./loadHolidayCalendar";

// Add or remove single public holidays in a loaded calendar (sean, 15 Nov 2026).
// Changes made by hand survive reloading the calendar.

const de2026: OpenHolidaysEntry[] = JSON.parse(readFileSync("tests/fixtures/openholidays/DE-2026.json", "utf8"));
const actor = "Capacity Admin";
const load = () => loadHolidayCalendar(db, actor, { country: "DE", year: 2026, fetchEntries: async () => de2026 });
const visit = { country: "DE", date: "2026-07-01", name: "Company day", regions: ["DE-BY"], reason: "Agreed with HR" };
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await db.insert(t.locations).values([
    { code: "DE-BY", country: "DE", name: "Bavaria" },
    { code: "DE-NI", country: "DE", name: "Lower Saxony" },
  ]);
  await load();
});

const view = (region?: string) => getHolidayCalendar(db, { country: "DE", year: 2026, region });
const named = async (name: string) => (await view()).holidays.find((h) => h.name === name);

describe("addPublicHoliday", () => {
  it("adds a holiday by hand, marked as added by hand, and logs it", async () => {
    expect(await addPublicHoliday(db, actor, visit)).toEqual({ ok: true });
    expect(await named("Company day")).toMatchObject({ date: "2026-07-01", regions: ["DE-BY"], origin: "Added" });
    expect((await view("DE-NI")).holidays.map((h) => h.name)).not.toContain("Company day");
    expect((await db.select().from(t.auditLog)).at(-1)).toMatchObject({ entity: "public_holidays", action: "add", reason: "Agreed with HR" });
  });

  it("no regions means the whole country", async () => {
    await addPublicHoliday(db, actor, { ...visit, regions: [] });
    expect((await view("DE-NI")).holidays.map((h) => h.name)).toContain("Company day");
  });

  it("checks the date, name and regions", async () => {
    expect(await addPublicHoliday(db, actor, { ...visit, date: "2026-02-30", name: " ", regions: ["FR-NAQ"] })).toEqual({ ok: false, errors: [
      "Date must be a real date", "Name is needed", "FR-NAQ is not a location in DE",
    ] });
  });

  it("needs the calendar for that year to be loaded first", async () => {
    expect(await addPublicHoliday(db, actor, { ...visit, date: "2027-07-01" }))
      .toEqual({ ok: false, errors: ["Load the DE 2027 calendar first"] });
  });

  it("refuses the same holiday twice", async () => {
    await addPublicHoliday(db, actor, visit);
    expect(await addPublicHoliday(db, actor, { ...visit, name: "company day" }))
      .toEqual({ ok: false, errors: ['"company day" is already a holiday on 1 Jul 2026'] });
  });

  it("is kept when the calendar is reloaded", async () => {
    await addPublicHoliday(db, actor, visit);
    await load();
    expect(await named("Company day")).toBeDefined();
  });
});

describe("removePublicHoliday", () => {
  it("removes a holiday added by hand completely", async () => {
    await addPublicHoliday(db, actor, visit);
    const added = await named("Company day");
    expect(await removePublicHoliday(db, actor, { id: added!.id, reason: "Typo" })).toEqual({ ok: true });
    expect(await named("Company day")).toBeUndefined();
    expect((await view()).removed).toEqual([]);
  });

  it("removes a loaded holiday, lists it as removed, and keeps it removed after a reload", async () => {
    const epiphany = await named("Epiphany");
    expect(await removePublicHoliday(db, actor, { id: epiphany!.id, reason: "Not observed by Dedalus" })).toEqual({ ok: true });
    expect(await named("Epiphany")).toBeUndefined();
    expect((await view()).removed).toEqual([expect.objectContaining({ date: "2026-01-06", name: "Epiphany" })]);
    expect((await db.select().from(t.auditLog)).at(-1)).toMatchObject({ entity: "public_holidays", action: "remove", reason: "Not observed by Dedalus" });
    await load();
    expect(await named("Epiphany")).toBeUndefined();
  });

  it("refuses an unknown holiday", async () => {
    expect(await removePublicHoliday(db, actor, { id: 99999, reason: "" })).toEqual({ ok: false, errors: ["That holiday no longer exists"] });
  });
});

describe("putBackPublicHoliday", () => {
  it("puts a removed loaded holiday back", async () => {
    const epiphany = await named("Epiphany");
    await removePublicHoliday(db, actor, { id: epiphany!.id, reason: "" });
    const [removed] = (await view()).removed;
    expect(await putBackPublicHoliday(db, actor, { id: removed!.id })).toEqual({ ok: true });
    expect(await named("Epiphany")).toMatchObject({ regions: ["DE-ST", "DE-BW", "DE-BY"], origin: "Loaded" });
    expect((await view()).removed).toEqual([]);
    expect(await db.select().from(t.publicHolidays).where(and(eq(t.publicHolidays.name, "Epiphany"), eq(t.publicHolidays.country, "DE")))).toHaveLength(1);
  });
});
