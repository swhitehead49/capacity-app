import { describe, expect, it } from "vitest";
import { resolveAllocation } from "./allocation";
import type { PublicHoliday } from "./holidays";
import { teamCapacity, type Member, type TeamCapacityInput } from "./teamCapacity";

// End-to-end check of section 3 (FR-13, FR-14) on the DRGW pilot team for sprint S001.
// People are anonymised: same hours, allocations and locations as the workbook.

const fullTime = (id: string, region: string, teamAllocation = 1, contractedHours = 40): Member => ({
  id,
  active: true,
  location: { country: "DE", region },
  contractedHours,
  standardHours: 40,
  teamAllocation,
  employment: {}, // no start or end date — the case the workbook got wrong
  absences: [],
});

const drgw: Member[] = [
  fullTime("A", "DE-BY"),
  fullTime("B", "DE-NI", 0.9, 36),
  fullTime("C", "DE-RP"),
  fullTime("D", "DE-RP", 1, 30),
  fullTime("E", "DE-RP"),
  { ...fullTime("F", "DE-RP"), contractedHours: null }, // incomplete inputs
  fullTime("G", "DE-RP"),
  fullTime("H", "DE-RP"),
  fullTime("I", "DE-SL", 0.5),
  fullTime("J", "DE-RP"),
];

const germanHolidays2026: PublicHoliday[] = [
  { date: "2026-10-31", country: "DE", regions: ["DE-NI"], name: "Reformation Day" }, // Saturday
  { date: "2026-11-01", country: "DE", regions: ["DE-BY", "DE-RP", "DE-SL"], name: "All Saints' Day" }, // Sunday
];

const novemberForecast = ["DE-BY", "DE-NI", "DE-RP", "DE-SL"].map((region) => ({
  region,
  month: "2026-11",
  availability: 0.9,
}));

const activeDefault = resolveAllocation({
  teamDefault: { status: "Active", overhead: 0.2, split: { run: 0.3, fix: 0.2, sustain: 0.2, change: 0.3 } },
});

const baseInput: TeamCapacityInput = {
  period: { start: "2026-10-26", end: "2026-11-08" },
  mode: "Auto",
  members: drgw,
  holidays: germanHolidays2026,
  holidayCalendarsLoaded: ["DE:2026"],
  forecasts: novemberForecast,
  allocation: activeDefault,
};

describe("teamCapacity for DRGW, sprint S001", () => {
  const result = teamCapacity(baseInput);

  it("counts 10 people, 9 with complete inputs, 8.06 allocated FTE", () => {
    expect(result.headcount).toBe(10);
    expect(result.capacityReadyPeople).toBe(9);
    expect(result.allocatedFte).toBeCloseTo(8.06);
  });

  it("schedules 80.6 person-days (8.06 FTE × 10 weekdays) — the workbook showed 0", () => {
    expect(result.scheduledDays).toBeCloseTo(80.6);
    expect(result.holidayDeduction).toBe(0); // both holidays fall on the weekend
  });

  it("applies the 90% November forecast (period midpoint is 1 Nov): 72.54 days available", () => {
    expect(result.calendarAvailableDays).toBeCloseTo(72.54);
  });

  it("takes 20% overhead and splits 30/20/20/30", () => {
    expect(result.engineeringDays).toBeCloseTo(58.032);
    expect(result.run).toBeCloseTo(17.4096);
    expect(result.fix).toBeCloseTo(11.6064);
    expect(result.sustain).toBeCloseTo(11.6064);
    expect(result.change).toBeCloseTo(17.4096);
  });

  it("marks complete members Ready and the incomplete one Excluded (FR-14)", () => {
    expect(result.members.find((m) => m.id === "A")?.status).toBe("Ready");
    expect(result.members.find((m) => m.id === "F")?.status).toBe("Excluded");
    expect(result.members.find((m) => m.id === "F")?.inputStatus).toBe("Missing contracted hours");
  });
});

describe("teamCapacity statuses", () => {
  it("is Provisional when no holiday calendar is loaded for the location and year (BR-10)", () => {
    const result = teamCapacity({ ...baseInput, holidayCalendarsLoaded: [] });
    expect(result.members.find((m) => m.id === "A")?.status).toBe("Provisional");
    expect(result.calendarAvailableDays).toBeCloseTo(72.54); // still calculated, just flagged
  });

  it("shows calendar capacity only when there is no active allocation (BR-05)", () => {
    const result = teamCapacity({ ...baseInput, allocation: resolveAllocation({}) });
    expect(result.members.find((m) => m.id === "A")?.status).toBe("Calendar capacity only");
    expect(result.calendarAvailableDays).toBeCloseTo(72.54);
    expect(result.engineeringDays).toBeNull();
  });

  it("counts an inactive person as Excluded", () => {
    const result = teamCapacity({ ...baseInput, members: [{ ...fullTime("Z", "DE-RP"), active: false }] });
    expect(result.members[0]?.inputStatus).toBe("Inactive");
    expect(result.scheduledDays).toBe(0);
  });

  it("counts a mid-sprint joiner only from their start date", () => {
    const joiner = { ...fullTime("N", "DE-RP"), employment: { start: "2026-11-04" } };
    const result = teamCapacity({ ...baseInput, members: [joiner] });
    expect(result.scheduledDays).toBe(3);
  });
});
