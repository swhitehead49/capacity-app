import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import * as t from "../infrastructure/db/schema";
import { createTestDb, type Db } from "../infrastructure/db/testDb";
import { listHolidayCalendars } from "./loadHolidayCalendar";
import { uploadHolidayCsv } from "./uploadHolidayCsv";

// Decision Q4: the Capacity Admin uploads the India company holiday list once a year.

const actor = "Capacity Admin";
const csv = "date,name,regions\n2027-01-26,Republic Day,\n2027-08-15,Independence Day,\n2027-11-01,Karnataka Rajyotsava,IN-KA\n";
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
});

const indiaHolidays = () => db.select().from(t.publicHolidays).where(eq(t.publicHolidays.country, "IN"));

describe("uploadHolidayCsv", () => {
  it("saves the holidays and marks the calendar as loaded from a CSV upload", async () => {
    expect(await uploadHolidayCsv(db, actor, { country: "IN", year: 2027, csv })).toEqual({ ok: true, count: 3 });
    expect(await indiaHolidays()).toHaveLength(3);
    const [calendar] = await db.select().from(t.holidayCalendars);
    expect(calendar).toMatchObject({ country: "IN", year: 2027, source: "CSV upload" });
  });

  it("uploading again replaces that year", async () => {
    await uploadHolidayCsv(db, actor, { country: "IN", year: 2027, csv });
    await uploadHolidayCsv(db, actor, { country: "IN", year: 2027, csv: "date,name\n2027-10-02,Gandhi Jayanti" });
    expect((await indiaHolidays()).map((h) => h.name)).toEqual(["Gandhi Jayanti"]);
  });

  it("writes the upload to the audit log", async () => {
    await uploadHolidayCsv(db, actor, { country: "IN", year: 2027, csv });
    const [entry] = await db.select().from(t.auditLog);
    expect(entry).toMatchObject({
      actor, entity: "holiday_calendars", entityId: "IN:2027", action: "upload",
      before: { holidays: 0 }, after: { holidays: 3 },
    });
  });

  it("a file with any bad line saves nothing and lists the problems", async () => {
    const result = await uploadHolidayCsv(db, actor, { country: "IN", year: 2027, csv: "date,name\n2027-01-26,Republic Day\n2026-12-25,Christmas" });
    expect(result).toEqual({ ok: false, errors: ["Line 3: 2026-12-25 is not in 2027"] });
    expect(await indiaHolidays()).toHaveLength(0);
    expect(await db.select().from(t.auditLog)).toHaveLength(0);
  });

  it("needs a country code like IN", async () => {
    const result = await uploadHolidayCsv(db, actor, { country: "india", year: 2027, csv });
    expect(result).toEqual({ ok: false, errors: ["Country must be a two-letter code such as IN"] });
  });

  it("then shows as loaded, no longer missing", async () => {
    await db.insert(t.locations).values({ code: "IN-KA", country: "IN", name: "Bangalore" });
    await uploadHolidayCsv(db, actor, { country: "IN", year: 2027, csv });
    const { loaded, missing } = await listHolidayCalendars(db, "2026-11-08");
    expect(loaded).toEqual([expect.objectContaining({ country: "IN", year: 2027, source: "CSV upload", holidays: 3 })]);
    expect(missing).toEqual([{ country: "IN", year: 2026, how: "CSV upload" }]);
  });
});
