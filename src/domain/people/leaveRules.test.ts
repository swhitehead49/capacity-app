import { describe, expect, it } from "vitest";
import { LEAVE_TYPES, validateLeave } from "./leaveRules";

// UC09 / FR-07: a person's own leave, separate from public holidays (sean, 15 Nov 2026).

const leave = { startDate: "2026-12-21", endDate: "2026-12-24", type: "Annual leave", dayFraction: 1 };

describe("validateLeave", () => {
  it("accepts full days or half days of a known type", () => {
    expect(validateLeave(leave)).toEqual([]);
    expect(validateLeave({ ...leave, dayFraction: 0.5 })).toEqual([]);
    expect(LEAVE_TYPES).toContain("Sick leave");
  });

  it("needs both dates, in order", () => {
    expect(validateLeave({ ...leave, startDate: "" })).toContain("Start date is needed");
    expect(validateLeave({ ...leave, endDate: "" })).toContain("End date is needed");
    expect(validateLeave({ ...leave, endDate: "2026-12-20" })).toContain("End date can't be before the start date");
  });

  it("only full or half days, and a known type", () => {
    expect(validateLeave({ ...leave, dayFraction: 0.3 })).toContain("Choose full days or half days");
    expect(validateLeave({ ...leave, type: "Holiday" })).toContain(`Type must be one of: ${LEAVE_TYPES.join(", ")}`);
  });
});
