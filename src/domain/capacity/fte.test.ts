import { describe, expect, it } from "vitest";
import { allocatedFte, contractedFte } from "./fte";

// Section 3, steps 1 and 2 of docs/requirements.md
// Contracted FTE = contracted hours ÷ standard hours for the location
// Allocated FTE  = contracted FTE × team allocation %

describe("contractedFte", () => {
  it("is 1 for a full-time contract", () => {
    expect(contractedFte({ contractedHours: 40, standardHours: 40 })).toBe(1);
  });

  it("is 0.75 for 30 of 40 hours", () => {
    expect(contractedFte({ contractedHours: 30, standardHours: 40 })).toBe(0.75);
  });

  it("is 0.9 for 36 of 40 hours", () => {
    expect(contractedFte({ contractedHours: 36, standardHours: 40 })).toBeCloseTo(0.9);
  });
});

describe("allocatedFte", () => {
  it("is the contracted FTE when the person is 100% on the team", () => {
    expect(allocatedFte({ contractedHours: 40, standardHours: 40, teamAllocation: 1 })).toBe(1);
  });

  it("is halved when the person spends 50% of their time on the team", () => {
    expect(allocatedFte({ contractedHours: 40, standardHours: 40, teamAllocation: 0.5 })).toBe(0.5);
  });

  it("combines part-time and partial allocation: 36/40 hours × 90% = 0.81", () => {
    expect(allocatedFte({ contractedHours: 36, standardHours: 40, teamAllocation: 0.9 })).toBeCloseTo(0.81);
  });

  it("adds up to 8.06 for the DRGW pilot team (matches the workbook)", () => {
    const drgw = [
      { contractedHours: 40, standardHours: 40, teamAllocation: 1 },
      { contractedHours: 36, standardHours: 40, teamAllocation: 0.9 },
      { contractedHours: 40, standardHours: 40, teamAllocation: 1 },
      { contractedHours: 30, standardHours: 40, teamAllocation: 1 },
      { contractedHours: 40, standardHours: 40, teamAllocation: 1 },
      { contractedHours: 40, standardHours: 40, teamAllocation: 1 },
      { contractedHours: 40, standardHours: 40, teamAllocation: 1 },
      { contractedHours: 40, standardHours: 40, teamAllocation: 0.5 },
      { contractedHours: 40, standardHours: 40, teamAllocation: 1 },
    ];
    const total = drgw.reduce((sum, person) => sum + allocatedFte(person), 0);
    expect(total).toBeCloseTo(8.06);
  });
});
