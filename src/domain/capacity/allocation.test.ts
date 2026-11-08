import { describe, expect, it } from "vitest";
import { resolveAllocation, splitCapacity, validateSplit, type AllocationSetting } from "./allocation";

// Section 3 steps 7–8, FR-12, BR-01, BR-02, BR-05, BR-06 of docs/requirements.md.

const split = (run: number, fix: number, sustain: number, change: number) => ({ run, fix, sustain, change });

const teamDefault: AllocationSetting = { status: "Active", overhead: 0.2, split: split(0.3, 0.2, 0.2, 0.3) };
const quarter: AllocationSetting = { status: "Active", overhead: null, split: split(0.4, 0.2, 0.1, 0.3) };
const sprint: AllocationSetting = { status: "Active", overhead: 0.3, split: split(0.5, 0.2, 0.1, 0.2) };

describe("validateSplit", () => {
  it("accepts a split that adds up to 100% (BR-01)", () => {
    expect(validateSplit(split(0.3, 0.2, 0.2, 0.3))).toEqual([]);
  });

  it("rejects a split that does not add up to 100% (BR-01)", () => {
    expect(validateSplit(split(0.3, 0.2, 0.2, 0.2))).toContain("Run + Fix + Sustain + Change must add up to 100%");
  });

  it("rejects a percentage below 0 or above 100% (BR-02)", () => {
    expect(validateSplit(split(1.2, -0.2, 0, 0))).toContain("Every percentage must be between 0% and 100%");
  });
});

describe("resolveAllocation", () => {
  it("uses the team default when there are no overrides", () => {
    const result = resolveAllocation({ teamDefault });
    expect(result.split).toEqual(teamDefault.split);
    expect(result.splitSource).toBe("Team default");
    expect(result.overhead).toBe(0.2);
  });

  it("a quarter override beats the team default (FR-12)", () => {
    const result = resolveAllocation({ teamDefault, quarter });
    expect(result.split).toEqual(quarter.split);
    expect(result.splitSource).toBe("Quarter override");
  });

  it("a sprint override beats the quarter override (FR-12)", () => {
    const result = resolveAllocation({ teamDefault, quarter, sprint });
    expect(result.split).toEqual(sprint.split);
    expect(result.splitSource).toBe("Sprint override");
  });

  it("overhead is inherited when an override leaves it blank (BR-06)", () => {
    const result = resolveAllocation({ teamDefault, quarter });
    expect(result.overhead).toBe(0.2);
    expect(result.overheadSource).toBe("Team default");
  });

  it("an override can set its own overhead (BR-06)", () => {
    const result = resolveAllocation({ teamDefault, quarter, sprint });
    expect(result.overhead).toBe(0.3);
    expect(result.overheadSource).toBe("Sprint override");
  });

  it("ignores Draft and Retired settings (BR-05)", () => {
    const draftSprint: AllocationSetting = { ...sprint, status: "Draft" };
    const retiredQuarter: AllocationSetting = { ...quarter, status: "Retired" };
    const result = resolveAllocation({ teamDefault, quarter: retiredQuarter, sprint: draftSprint });
    expect(result.splitSource).toBe("Team default");
  });

  it("has no split when nothing is Active (calendar capacity only)", () => {
    const result = resolveAllocation({ teamDefault: { ...teamDefault, status: "Draft" } });
    expect(result.split).toBeNull();
    expect(result.overhead).toBeNull();
  });
});

describe("splitCapacity", () => {
  it("takes overhead off first, then splits the rest (steps 7–8)", () => {
    const result = splitCapacity(100, { overhead: 0.2, split: split(0.3, 0.2, 0.2, 0.3) });
    expect(result.engineeringDays).toBeCloseTo(80);
    expect(result.run).toBeCloseTo(24);
    expect(result.fix).toBeCloseTo(16);
    expect(result.sustain).toBeCloseTo(16);
    expect(result.change).toBeCloseTo(24);
  });

  it("shows calendar capacity only when there is no active allocation", () => {
    const result = splitCapacity(100, { overhead: null, split: null });
    expect(result).toEqual({ engineeringDays: null, contingencyDays: null, run: null, fix: null, sustain: null, change: null });
  });
});

// Contingency (decided 8 Nov 2026): a % held back after overhead, before the R/F/S/C split.
// Set on the team default; overrides may set their own or leave it blank to inherit. None set = 0%.
describe("contingency", () => {
  it("comes from the team default", () => {
    const result = resolveAllocation({ teamDefault: { ...teamDefault, contingency: 0.1 } });
    expect(result.contingency).toBe(0.1);
    expect(result.contingencySource).toBe("Team default");
  });

  it("is inherited when an override leaves it blank, and can be overridden", () => {
    const inherited = resolveAllocation({ teamDefault: { ...teamDefault, contingency: 0.1 }, quarter: { ...quarter, contingency: null } });
    expect(inherited.contingency).toBe(0.1);
    const own = resolveAllocation({ teamDefault: { ...teamDefault, contingency: 0.1 }, sprint: { ...sprint, contingency: 0.05 } });
    expect(own).toMatchObject({ contingency: 0.05, contingencySource: "Sprint override" });
  });

  it("is 0% when nothing sets it", () => {
    expect(resolveAllocation({ teamDefault })).toMatchObject({ contingency: 0, contingencySource: null });
  });

  it("is held back after overhead, and only the rest is split", () => {
    const result = splitCapacity(100, { overhead: 0.2, contingency: 0.1, split: split(0.3, 0.2, 0.2, 0.3) });
    expect(result.engineeringDays).toBeCloseTo(80);
    expect(result.contingencyDays).toBeCloseTo(8);
    expect(result.run).toBeCloseTo(21.6); // (80 - 8) × 30%
    expect(result.change).toBeCloseTo(21.6);
  });

  it("0% contingency changes nothing", () => {
    const result = splitCapacity(100, { overhead: 0.2, contingency: 0, split: split(0.3, 0.2, 0.2, 0.3) });
    expect(result.contingencyDays).toBe(0);
    expect(result.run).toBeCloseTo(24);
  });
});
