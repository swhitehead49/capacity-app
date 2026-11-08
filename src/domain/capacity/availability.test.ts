import { describe, expect, it } from "vitest";
import { availableDays, countAbsenceDays, type Absence } from "./availability";
import type { PublicHoliday } from "./holidays";

// Section 3, step 6 of docs/requirements.md, FR-07, BR-11, and the decision of 8 Nov 2026:
// in Auto mode, take off whichever is larger — booked absence or the forecast reduction.
// Days here are per person, before FTE is applied.

const sprintS001 = { start: "2026-10-26", end: "2026-11-08" }; // 10 weekdays
const vienna = { country: "AT", region: "AT-9" };
const holidays: PublicHoliday[] = [{ date: "2026-10-26", country: "AT", regions: [], name: "National Day" }];

describe("countAbsenceDays", () => {
  it("counts the weekdays of a booked absence inside the window", () => {
    const absences: Absence[] = [{ start: "2026-10-28", end: "2026-10-30", dayFraction: 1, status: "Booked" }];
    expect(countAbsenceDays(sprintS001, vienna, absences, holidays)).toBe(3);
  });

  it("only counts the part of an absence that overlaps the window", () => {
    const absences: Absence[] = [{ start: "2026-11-05", end: "2026-11-13", dayFraction: 1, status: "Booked" }];
    expect(countAbsenceDays(sprintS001, vienna, absences, holidays)).toBe(2); // Thu 5, Fri 6
  });

  it("does not count weekends or public holidays as absence", () => {
    const absences: Absence[] = [{ start: "2026-10-24", end: "2026-10-27", dayFraction: 1, status: "Booked" }];
    expect(countAbsenceDays(sprintS001, vienna, absences, holidays)).toBe(1); // Mon 26 is a holiday; Tue 27 counts
  });

  it("counts half days", () => {
    const absences: Absence[] = [{ start: "2026-10-28", end: "2026-10-29", dayFraction: 0.5, status: "Booked" }];
    expect(countAbsenceDays(sprintS001, vienna, absences, holidays)).toBe(1);
  });

  it("ignores cancelled absences", () => {
    const absences: Absence[] = [{ start: "2026-10-28", end: "2026-10-30", dayFraction: 1, status: "Cancelled" }];
    expect(countAbsenceDays(sprintS001, vienna, absences, holidays)).toBe(0);
  });
});

describe("availableDays", () => {
  // 10 working days, a forecast of 90% availability means 1 day expected away.

  it("Auto: uses the forecast when booked absence is smaller", () => {
    expect(availableDays({ workingDays: 10, absenceDays: 0.5, forecast: 0.9, mode: "Auto" })).toBeCloseTo(9);
  });

  it("Auto: uses booked absence when it is larger than the forecast", () => {
    expect(availableDays({ workingDays: 10, absenceDays: 3, forecast: 0.9, mode: "Auto" })).toBe(7);
  });

  it("Explicit only: ignores the forecast", () => {
    expect(availableDays({ workingDays: 10, absenceDays: 0.5, forecast: 0.9, mode: "Explicit only" })).toBe(9.5);
  });

  it("Forecast only: ignores booked absence", () => {
    expect(availableDays({ workingDays: 10, absenceDays: 3, forecast: 0.9, mode: "Forecast only" })).toBeCloseTo(9);
  });

  it("treats a missing forecast as 100% available (BR-11)", () => {
    expect(availableDays({ workingDays: 10, absenceDays: 0, forecast: null, mode: "Auto" })).toBe(10);
  });

  it("never goes below zero", () => {
    expect(availableDays({ workingDays: 2, absenceDays: 5, forecast: 1, mode: "Explicit only" })).toBe(0);
  });
});
