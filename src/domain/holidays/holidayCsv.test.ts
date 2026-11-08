import { describe, expect, it } from "vitest";
import { parseHolidayCsv } from "./holidayCsv";

// Decision Q4 (8 Nov 2026): the Capacity Admin uploads the Dedalus India company holiday list once a year.
// Format: a header row "date,name" and optionally a "regions" column (codes split by ";", blank = whole country).

const read = (csv: string, year = 2027) => parseHolidayCsv(csv, { country: "IN", year });

describe("parseHolidayCsv", () => {
  it("reads one holiday per line", () => {
    expect(read("date,name\n2027-01-26,Republic Day\n2027-08-15,Independence Day\n")).toEqual({
      holidays: [
        { date: "2027-01-26", country: "IN", regions: [], name: "Republic Day" },
        { date: "2027-08-15", country: "IN", regions: [], name: "Independence Day" },
      ],
      errors: [],
    });
  });

  it("accepts dates written day/month/year, as HR lists often are", () => {
    expect(read("date,name\n26/01/2027,Republic Day").holidays[0]?.date).toBe("2027-01-26");
  });

  it("keeps regions when given, so an office-only holiday only counts there", () => {
    const { holidays } = read("date,name,regions\n2027-11-01,Karnataka Rajyotsava,IN-KA\n2027-01-14,Pongal,IN-TN;IN-KA");
    expect(holidays.map((h) => h.regions)).toEqual([["IN-KA"], ["IN-TN", "IN-KA"]]);
  });

  it("handles names in quotes that contain commas", () => {
    expect(read('date,name\n2027-10-29,"Diwali, day 1"').holidays[0]?.name).toBe("Diwali, day 1");
  });

  it("ignores blank lines, extra spaces, header case and the Excel byte-order mark", () => {
    const { holidays, errors } = read("﻿Date , Name\r\n\r\n 2027-05-01 , May Day \r\n");
    expect(errors).toEqual([]);
    expect(holidays).toEqual([{ date: "2027-05-01", country: "IN", regions: [], name: "May Day" }]);
  });

  it("says which line is wrong and why", () => {
    const { errors } = read("date,name\n2027-02-31,Bad day\nsoon,Later\n2026-12-25,Christmas\n2027-03-01,\n");
    expect(errors).toEqual([
      'Line 2: "2027-02-31" is not a real date (use YYYY-MM-DD or DD/MM/YYYY)',
      'Line 3: "soon" is not a real date (use YYYY-MM-DD or DD/MM/YYYY)',
      "Line 4: 2026-12-25 is not in 2027",
      "Line 5: the holiday needs a name",
    ]);
  });

  it("needs date and name columns", () => {
    expect(read("day,holiday\n2027-01-26,Republic Day").errors).toEqual([
      'The first line must be the headings "date,name" (and optionally ",regions")',
    ]);
  });

  it("an empty file is an error", () => {
    expect(read("date,name\n").errors).toEqual(["The file has no holidays in it"]);
  });
});
