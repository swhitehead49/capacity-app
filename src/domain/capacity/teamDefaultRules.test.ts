import { describe, expect, it } from "vitest";
import { validateTeamDefault } from "./teamDefaultRules";

// BR-01, BR-02, BR-03: what a team default must contain before it can be Active.
// One 100% (sean, 15 Nov 2026): overhead + contingency + the five work types add up to 100%.

const good = {
  status: "Active" as const,
  effectiveFrom: "2026-01-01",
  overhead: 0.2,
  split: { run: 0.24, fix: 0.16, sustain: 0.16, change: 0.24 },
};

describe("validateTeamDefault", () => {
  it("accepts a complete Active default", () => {
    expect(validateTeamDefault(good)).toEqual([]);
  });

  it("needs an effective date to be Active (BR-03)", () => {
    expect(validateTeamDefault({ ...good, effectiveFrom: null })).toContain("An Active default needs an effective-from date");
  });

  it("needs an overhead to be Active (BR-03)", () => {
    expect(validateTeamDefault({ ...good, overhead: null })).toContain("Organisational % is needed (it can be 0)");
  });

  it("checks everything adds up to 100%, and says the total (BR-01)", () => {
    expect(validateTeamDefault({ ...good, split: { run: 0.3, fix: 0.2, sustain: 0.2, change: 0.3 } }))
      .toContain("Organisational + Unplanned + Maintenance + Technical improvements + Change + Enabling/Training must add up to 100% (they add up to 120%)");
  });

  it("rejects a % outside 0–100% (BR-02)", () => {
    expect(validateTeamDefault({ ...good, overhead: 1.2, contingency: -0.2 })).toContain("Every percentage must be between 0% and 100%");
  });

  it("lets a Draft be saved unfinished, so work in progress isn't lost", () => {
    expect(validateTeamDefault({ ...good, status: "Draft", effectiveFrom: null, overhead: null,
      split: { run: 0.5, fix: 0, sustain: 0, change: 0 } })).toEqual([]);
  });
});
