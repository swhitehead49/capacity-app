import { describe, expect, it } from "vitest";
import { countWeekdays, effectiveWindow } from "./workingWindow";

// Section 3, steps 3 and 4 of docs/requirements.md, and BR-08:
// capacity only counts between employment start and end; a blank date means "no limit".
// Dates are written as "YYYY-MM-DD" text so time zones can't shift them.

const sprintS001 = { start: "2026-10-26", end: "2026-11-08" }; // Mon 26 Oct – Sun 8 Nov

describe("effectiveWindow", () => {
  it("is the whole period when the person has no employment dates (the workbook gave 0 here)", () => {
    expect(effectiveWindow(sprintS001, {})).toEqual(sprintS001);
  });

  it("starts on the joining date when someone joins mid-sprint", () => {
    expect(effectiveWindow(sprintS001, { start: "2026-11-04" })).toEqual({
      start: "2026-11-04",
      end: "2026-11-08",
    });
  });

  it("ends on the leaving date when someone leaves mid-sprint", () => {
    expect(effectiveWindow(sprintS001, { end: "2026-10-30" })).toEqual({
      start: "2026-10-26",
      end: "2026-10-30",
    });
  });

  it("is empty when the person left before the period", () => {
    expect(effectiveWindow(sprintS001, { end: "2026-09-30" })).toBeNull();
  });

  it("is empty when the person joins after the period", () => {
    expect(effectiveWindow(sprintS001, { start: "2026-12-01" })).toBeNull();
  });
});

describe("countWeekdays", () => {
  it("counts 10 weekdays in a two-week sprint", () => {
    expect(countWeekdays(sprintS001)).toBe(10);
  });

  it("counts 3 weekdays from Wednesday to Sunday", () => {
    expect(countWeekdays({ start: "2026-11-04", end: "2026-11-08" })).toBe(3);
  });

  it("counts 0 for a weekend", () => {
    expect(countWeekdays({ start: "2026-11-07", end: "2026-11-08" })).toBe(0);
  });

  it("counts 66 weekdays in Q4 2026", () => {
    expect(countWeekdays({ start: "2026-10-01", end: "2026-12-31" })).toBe(66);
  });

  it("counts 0 when there is no window", () => {
    expect(countWeekdays(null)).toBe(0);
  });
});
