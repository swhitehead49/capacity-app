import { describe, expect, it } from "vitest";
import { countHolidayWeekdays, type PublicHoliday } from "./holidays";

// Section 3, step 5 of docs/requirements.md, and BR-09:
// a public holiday is taken off only if it falls on a weekday, inside the window,
// and applies to the person's location. Holidays use the OpenHolidays shape (FR-20):
// a country, plus a list of regions — an empty list means the whole country.

const holidays: PublicHoliday[] = [
  { date: "2026-10-26", country: "AT", regions: [], name: "National Day" }, // Monday
  { date: "2026-10-31", country: "DE", regions: ["DE-NI"], name: "Reformation Day" }, // Saturday
  { date: "2026-11-01", country: "DE", regions: ["DE-BY"], name: "All Saints' Day" }, // Sunday
  { date: "2026-12-25", country: "DE", regions: [], name: "Christmas Day" }, // Friday
  { date: "2027-01-06", country: "DE", regions: ["DE-BY"], name: "Epiphany" }, // Wednesday
];

const sprintS001 = { start: "2026-10-26", end: "2026-11-08" };
const q4 = { start: "2026-10-01", end: "2026-12-31" };
const vienna = { country: "AT", region: "AT-9" };
const bavaria = { country: "DE", region: "DE-BY" };
const lowerSaxony = { country: "DE", region: "DE-NI" };

describe("countHolidayWeekdays", () => {
  it("takes off a national holiday on a weekday (Austria, Monday 26 Oct)", () => {
    expect(countHolidayWeekdays(sprintS001, vienna, holidays)).toBe(1);
  });

  it("ignores another country's holidays", () => {
    expect(countHolidayWeekdays(sprintS001, bavaria, holidays)).toBe(0);
  });

  it("ignores a holiday that falls on a weekend", () => {
    expect(countHolidayWeekdays(sprintS001, lowerSaxony, holidays)).toBe(0);
  });

  it("counts a national holiday for every region of the country", () => {
    expect(countHolidayWeekdays(q4, bavaria, holidays)).toBe(1); // Christmas Day only
    expect(countHolidayWeekdays(q4, lowerSaxony, holidays)).toBe(1);
  });

  it("ignores holidays outside the window", () => {
    expect(countHolidayWeekdays(q4, bavaria, holidays)).toBe(1); // Epiphany is in January
  });

  it("counts a date once even if it is listed twice", () => {
    const duplicated = [...holidays, { date: "2026-12-25", country: "DE", regions: ["DE-BY"], name: "Christmas Day" }];
    expect(countHolidayWeekdays(q4, bavaria, duplicated)).toBe(1);
  });

  it("is 0 when there is no window", () => {
    expect(countHolidayWeekdays(null, vienna, holidays)).toBe(0);
  });
});
