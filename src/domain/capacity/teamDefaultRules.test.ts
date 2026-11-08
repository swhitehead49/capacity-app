import { describe, expect, it } from "vitest";
import { validateTeamDefault } from "./teamDefaultRules";

// BR-01, BR-02, BR-03: what a team default must contain before it can be Active.

const good = {
  status: "Active" as const,
  effectiveFrom: "2026-01-01",
  overhead: 0.2,
  split: { run: 0.3, fix: 0.2, sustain: 0.2, change: 0.3 },
};

describe("validateTeamDefault", () => {
  it("accepts a complete Active default", () => {
    expect(validateTeamDefault(good)).toEqual([]);
  });

  it("needs an effective date to be Active (BR-03)", () => {
    expect(validateTeamDefault({ ...good, effectiveFrom: null })).toContain("An Active default needs an effective-from date");
  });

  it("needs an overhead to be Active (BR-03)", () => {
    expect(validateTeamDefault({ ...good, overhead: null })).toContain("An Active default needs an overhead %");
  });

  it("rejects overhead outside 0–100% (BR-02)", () => {
    expect(validateTeamDefault({ ...good, overhead: 1.5 })).toContain("Overhead must be between 0% and 100%");
  });

  it("passes on the split rules (BR-01)", () => {
    expect(validateTeamDefault({ ...good, split: { run: 0.5, fix: 0.5, sustain: 0.5, change: 0 } }))
      .toContain("Run + Fix + Sustain + Change must add up to 100%");
  });

  it("lets a Draft be saved unfinished, so work in progress isn't lost", () => {
    expect(validateTeamDefault({ ...good, status: "Draft", effectiveFrom: null, overhead: null,
      split: { run: 0.5, fix: 0, sustain: 0, change: 0 } })).toEqual([]);
  });

  it("rejects contingency outside 0–100% (contingency, decided 8 Nov 2026)", () => {
    expect(validateTeamDefault({ ...good, contingency: 1.2 })).toContain("Contingency must be between 0% and 100%");
  });
});
