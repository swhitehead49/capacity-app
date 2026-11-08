import { describe, expect, it } from "vitest";
import { nameClashes, sameName } from "./teamRules";

describe("team name rules (BR-16)", () => {
  const others = [{ name: "Payments", parentGroup: "Platform" }, { name: "Payments", parentGroup: "Clinical" }];

  it("names match ignoring capitals and spaces", () => {
    expect(sameName(" payments ", "Payments")).toBe(true);
  });

  it("a clash in the same parent is an error", () => {
    expect(nameClashes("payments", "Platform", others).errors).toEqual(['"payments" is already a team in Platform']);
  });

  it("the same name in other parents is a warning for each", () => {
    expect(nameClashes("Payments", "Imaging", others)).toEqual({
      errors: [], warnings: ['"Payments" is also a team in Platform', '"Payments" is also a team in Clinical'],
    });
  });
});
