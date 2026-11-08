import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseOpenHolidays, type OpenHolidaysEntry } from "./openHolidays";

const de2026: OpenHolidaysEntry[] = JSON.parse(readFileSync("tests/fixtures/openholidays/DE-2026.json", "utf8"));

const entry = (over: Partial<OpenHolidaysEntry>): OpenHolidaysEntry => ({
  startDate: "2026-05-01", endDate: "2026-05-01", type: "Public",
  name: [{ language: "EN", text: "Labour Day" }], temporalScope: "FullDay", nationwide: true, ...over,
});

describe("parseOpenHolidays (FR-20)", () => {
  it("turns the real German 2026 answer into 20 holidays", () => {
    expect(parseOpenHolidays("DE", de2026)).toHaveLength(20);
  });

  it("a nationwide holiday applies to the whole country (no regions)", () => {
    const [h] = parseOpenHolidays("DE", [entry({})]);
    expect(h).toEqual({ date: "2026-05-01", country: "DE", regions: [], name: "Labour Day" });
  });

  it("a regional holiday keeps its region codes, e.g. All Saints' Day in Bavaria", () => {
    const allSaints = parseOpenHolidays("DE", de2026).find((h) => h.date === "2026-11-01");
    expect(allSaints?.regions).toEqual(["DE-BW", "DE-BY", "DE-NW", "DE-RP", "DE-SL"]);
  });

  it("a holiday spanning several days becomes one record per day", () => {
    const days = parseOpenHolidays("FR", [entry({ startDate: "2026-12-24", endDate: "2026-12-26", name: [{ language: "EN", text: "Xmas" }] })]);
    expect(days.map((d) => d.date)).toEqual(["2026-12-24", "2026-12-25", "2026-12-26"]);
  });

  it("skips half-day holidays (we only plan in whole days)", () => {
    expect(parseOpenHolidays("DE", [entry({ temporalScope: "HalfDay" })])).toEqual([]);
  });

  it("skips anything that is not a public holiday", () => {
    expect(parseOpenHolidays("DE", [entry({ type: "Bank" })])).toEqual([]);
  });

  it("uses the English name, falling back to the first name given", () => {
    const [h] = parseOpenHolidays("AT", [entry({ name: [{ language: "DE", text: "Staatsfeiertag" }] })]);
    expect(h?.name).toBe("Staatsfeiertag");
  });
});
