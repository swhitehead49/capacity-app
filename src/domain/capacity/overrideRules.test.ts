import { describe, expect, it } from "vitest";
import { validateOverride } from "./overrideRules";

// BR-01, BR-02, BR-04, BR-06: what a quarter or sprint override must contain.

const good = {
  status: "Active" as const,
  overhead: null,
  split: { run: 0.5, fix: 0.2, sustain: 0.1, change: 0.2 },
  reason: "Release sprint",
};

describe("validateOverride", () => {
  it("accepts an Active override that inherits overhead (BR-06)", () => {
    expect(validateOverride(good)).toEqual([]);
  });

  it("needs a reason to be Active (BR-04)", () => {
    expect(validateOverride({ ...good, reason: " " })).toContain("An Active override needs a reason");
  });

  it("checks the split adds up to 100% (BR-01)", () => {
    expect(validateOverride({ ...good, split: { run: 0.5, fix: 0.2, sustain: 0.1, change: 0.1 } }))
      .toContain("Run + Fix + Sustain + Change must add up to 100%");
  });

  it("checks an overhead it sets is between 0% and 100% (BR-02)", () => {
    expect(validateOverride({ ...good, overhead: -0.1 })).toContain("Overhead must be between 0% and 100%");
  });

  it("lets a Draft be saved unfinished", () => {
    expect(validateOverride({ ...good, status: "Draft", reason: "", split: { run: 1, fix: 1, sustain: 0, change: 0 } })).toEqual([]);
  });
});
