import { describe, expect, it } from "vitest";
import { validateOverride } from "./overrideRules";

// BR-01, BR-02, BR-04: what a quarter or sprint override must contain.
// One 100% (sean, 15 Nov 2026): an Active override gives all seven numbers; nothing is inherited.

const good = {
  status: "Active" as const,
  overhead: 0.2,
  contingency: 0,
  split: { run: 0.4, fix: 0.2, sustain: 0.1, change: 0.1 },
  reason: "Release sprint",
};

const ONE_HUNDRED = "Organisational + Unplanned + Maintenance + Technical improvements + Change + Enabling/Training must add up to 100%";

describe("validateOverride", () => {
  it("accepts a complete Active override", () => {
    expect(validateOverride(good)).toEqual([]);
  });

  it("needs a reason to be Active (BR-04)", () => {
    expect(validateOverride({ ...good, reason: " " })).toContain("An Active override needs a reason");
  });

  it("needs an overhead %", () => {
    expect(validateOverride({ ...good, overhead: null })).toContain("Organisational % is needed (it can be 0)");
  });

  it("checks everything adds up to 100% (BR-01)", () => {
    expect(validateOverride({ ...good, overhead: 0.3 })[0]).toContain(ONE_HUNDRED);
  });

  it("checks every % is between 0% and 100% (BR-02)", () => {
    expect(validateOverride({ ...good, contingency: -0.1, split: { ...good.split, run: 0.5 } })).toContain("Every percentage must be between 0% and 100%");
  });

  it("lets a Draft be saved unfinished", () => {
    expect(validateOverride({ ...good, status: "Draft", reason: "", overhead: null, split: { run: 1, fix: 1, sustain: 0, change: 0 } })).toEqual([]);
  });
});
