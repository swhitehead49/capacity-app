import { describe, expect, it } from "vitest";
import { resolveAllocation, splitCapacity, validateAllocation, type AllocationSetting } from "./allocation";

// Section 3 steps 7–8, FR-12, BR-01, BR-02, BR-05 of docs/requirements.md.
// One 100% (sean, 15 Nov 2026): Overhead + Contingency + Run + Fix + Sustain + Change + Enabling/Training
// add up to 100% of available days. Each one is simply its % of the available days.

const split = (run: number, fix: number, sustain: number, change: number, enabling = 0) => ({ run, fix, sustain, change, enabling });

const teamDefault: AllocationSetting = { status: "Active", overhead: 0.2, contingency: 0, split: split(0.24, 0.16, 0.16, 0.24) };
const quarter: AllocationSetting = { status: "Active", overhead: 0.2, contingency: 0.1, split: split(0.3, 0.1, 0.1, 0.2) };
const sprint: AllocationSetting = { status: "Active", overhead: 0.3, contingency: 0, split: split(0.3, 0.2, 0.1, 0.1) };

describe("validateAllocation (BR-01, BR-02)", () => {
  it("accepts overhead, contingency and the five work types adding up to 100%", () => {
    expect(validateAllocation({ overhead: 0.2, contingency: 0.05, split: split(0.2, 0.15, 0.1, 0.2, 0.1) })).toEqual([]);
  });

  it("a blank contingency counts as 0%", () => {
    expect(validateAllocation({ overhead: 0.2, contingency: null, split: split(0.24, 0.16, 0.16, 0.24) })).toEqual([]);
  });

  it("says what the numbers add up to when they don't make 100%", () => {
    expect(validateAllocation({ overhead: 0.2, contingency: 0, split: split(0.3, 0.2, 0.2, 0.3) })).toEqual([
      "Overhead + Contingency + Run + Fix + Sustain + Change + Enabling/Training must add up to 100% (they add up to 120%)",
    ]);
  });

  it("accepts decimals that add up to 100", () => {
    expect(validateAllocation({ overhead: 0.3333, contingency: 0, split: split(0.3333, 0.3334, 0, 0) })).toEqual([]);
  });

  it("needs an overhead % (it can be 0)", () => {
    expect(validateAllocation({ overhead: null, contingency: 0, split: split(0.5, 0.5, 0, 0) })).toEqual(["Overhead % is needed (it can be 0)"]);
    expect(validateAllocation({ overhead: 0, contingency: 0, split: split(0.5, 0.5, 0, 0) })).toEqual([]);
  });

  it("rejects a percentage below 0 or above 100%", () => {
    expect(validateAllocation({ overhead: 0, contingency: 0, split: split(1.2, -0.2, 0, 0) })).toContain("Every percentage must be between 0% and 100%");
  });
});

describe("resolveAllocation (FR-12, BR-05)", () => {
  it("uses the team default when there are no overrides", () => {
    const result = resolveAllocation({ teamDefault });
    expect(result).toMatchObject({ split: teamDefault.split, splitSource: "Team default", overhead: 0.2, contingency: 0 });
  });

  it("a quarter override beats the team default, and supplies all seven numbers", () => {
    const result = resolveAllocation({ teamDefault, quarter });
    expect(result).toMatchObject({ split: quarter.split, splitSource: "Quarter override", overhead: 0.2, contingency: 0.1 });
    expect(result.overheadSource).toBe("Quarter override");
    expect(result.contingencySource).toBe("Quarter override");
  });

  it("a sprint override beats the quarter override", () => {
    const result = resolveAllocation({ teamDefault, quarter, sprint });
    expect(result).toMatchObject({ splitSource: "Sprint override", overhead: 0.3, contingency: 0 });
  });

  it("ignores Draft and Retired settings", () => {
    const result = resolveAllocation({ teamDefault, quarter: { ...quarter, status: "Retired" }, sprint: { ...sprint, status: "Draft" } });
    expect(result.splitSource).toBe("Team default");
  });

  it("has no split when nothing is Active (calendar capacity only)", () => {
    const result = resolveAllocation({ teamDefault: { ...teamDefault, status: "Draft" } });
    expect(result.split).toBeNull();
    expect(result.overhead).toBeNull();
  });
});

describe("splitCapacity (steps 7–8)", () => {
  it("gives each part its % of the available days", () => {
    const result = splitCapacity(100, { overhead: 0.2, contingency: 0.05, split: split(0.2, 0.15, 0.1, 0.2, 0.1) });
    expect(result.engineeringDays).toBeCloseTo(80); // available minus overhead
    expect(result.contingencyDays).toBeCloseTo(5);
    expect(result.run).toBeCloseTo(20);
    expect(result.fix).toBeCloseTo(15);
    expect(result.sustain).toBeCloseTo(10);
    expect(result.change).toBeCloseTo(20);
    expect(result.enabling).toBeCloseTo(10);
  });

  it("no contingency means 0 contingency days", () => {
    expect(splitCapacity(100, { overhead: 0.2, split: split(0.24, 0.16, 0.16, 0.24) })).toMatchObject({ contingencyDays: 0, run: 24 });
  });

  it("shows calendar capacity only when there is no active allocation", () => {
    expect(splitCapacity(100, { overhead: null, split: null }))
      .toEqual({ engineeringDays: null, contingencyDays: null, run: null, fix: null, sustain: null, change: null, enabling: null });
  });
});
