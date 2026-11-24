import { describe, expect, it } from "vitest";
import { cleanName, fullName, personKey, shownEmail, personLabel, validateMembership, validatePerson, validateEndDate, dayBefore } from "./memberRules";

// FR-03, FR-05, BR-21, BR-22: what a team member record needs before it is saved.

describe("validatePerson", () => {
  const ok = { email: "a@example.com", contractedHours: 40, employmentStart: "2026-01-01", employmentEnd: null };

  it("accepts a complete person", () => {
    expect(validatePerson(ok)).toEqual([]);
  });

  it("accepts blanks: an incomplete person is saved and shown as incomplete (FR-04)", () => {
    expect(validatePerson({ email: "a@example.com", contractedHours: null, employmentStart: null, employmentEnd: null })).toEqual([]);
  });

  it("an email, when given, must look real", () => {
    expect(validatePerson({ ...ok, email: "anna" })).toEqual(["Email must look like name@company.com"]);
  });

  // FR-05c (sean, 24 Nov 2026): "make all emails optional". Without one, the person's name identifies them.
  it("the email is optional, but then a first or last name is needed", () => {
    expect(validatePerson({ ...ok, email: "", firstName: "Ada" })).toEqual([]);
    expect(validatePerson({ ...ok, email: "" })).toEqual(["Email or a name is needed"]);
    expect(validatePerson({ ...ok, email: personKey("", "Ada", null) })).toEqual([]); // a saved person without an email
  });

  it("contracted hours must be between 1 and 60 a week", () => {
    expect(validatePerson({ ...ok, contractedHours: 0 })).toEqual(["Contracted hours must be between 1 and 60"]);
    expect(validatePerson({ ...ok, contractedHours: 61 })).toEqual(["Contracted hours must be between 1 and 60"]);
  });

  it("employment can't end before it starts", () => {
    expect(validatePerson({ ...ok, employmentEnd: "2025-12-31" })).toEqual(["Employment end must be on or after its start"]);
  });
});

describe("validateMembership", () => {
  const ok = { teamAllocation: 0.5, startDate: "2026-11-09" };

  it("accepts a team % above 0 and up to 100", () => {
    expect(validateMembership(ok)).toEqual([]);
    expect(validateMembership({ ...ok, teamAllocation: 1 })).toEqual([]);
  });

  it("rejects 0% or more than 100%", () => {
    expect(validateMembership({ ...ok, teamAllocation: 0 })).toEqual(["Team % must be more than 0 and at most 100"]);
    expect(validateMembership({ ...ok, teamAllocation: 1.2 })).toEqual(["Team % must be more than 0 and at most 100"]);
  });

  it("a team % is needed (BR-21)", () => {
    expect(validateMembership({ ...ok, teamAllocation: null })).toEqual(["Team % is needed"]);
  });

  it("needs a start date (BR-21)", () => {
    expect(validateMembership({ ...ok, startDate: "" })).toEqual(["Start date is needed"]);
  });
});

describe("validateEndDate", () => {
  it("an end date can't be before the start", () => {
    expect(validateEndDate({ startDate: "2026-11-09", endDate: "2026-11-08" })).toEqual(["End date must be on or after the start date (9 Nov 2026)"]);
  });

  it("ending on the start day is allowed (one day on the team)", () => {
    expect(validateEndDate({ startDate: "2026-11-09", endDate: "2026-11-09" })).toEqual([]);
  });

  it("needs a date", () => {
    expect(validateEndDate({ startDate: null, endDate: "" })).toEqual(["End date is needed"]);
  });
});

describe("dayBefore", () => {
  it("a move on 1 Dec ends the old membership on 30 Nov, so no day counts twice (BR-22)", () => {
    expect(dayBefore("2026-12-01")).toBe("2026-11-30");
    expect(dayBefore("2027-01-01")).toBe("2026-12-31");
  });
});

describe("names (FR-05a, sean 22 Nov 2026)", () => {
  it("cleans a typed name: trimmed, single spaces, blank = none", () => {
    expect(cleanName("  Mary   Ann ")).toBe("Mary Ann");
    expect(cleanName("   ")).toBeNull();
  });

  it("shows whichever parts of the name are known", () => {
    expect(fullName({ firstName: "Ada", lastName: "Lovelace" })).toBe("Ada Lovelace");
    expect(fullName({ firstName: null, lastName: "Lovelace" })).toBe("Lovelace");
    expect(fullName({ firstName: null, lastName: null })).toBeNull();
  });
});

// FR-05c (sean, 24 Nov 2026): people without an email are identified by their name.
describe("person keys", () => {
  it("is the email when there is one, otherwise made from the name", () => {
    expect(personKey(" Ada@Example.com ", "Ada", "Lovelace")).toBe("ada@example.com");
    expect(personKey("", "Ada", "Lovelace")).toBe("no-email:ada lovelace");
    expect(personKey(null, " ADA ", " lovelace ")).toBe("no-email:ada lovelace"); // same name, same person
  });

  it("shows the email only when there is a real one", () => {
    expect(shownEmail("ada@example.com")).toBe("ada@example.com");
    expect(shownEmail("no-email:ada lovelace")).toBeNull();
  });

  it("labels a person by name, else email", () => {
    expect(personLabel({ email: "no-email:ada lovelace", firstName: "Ada", lastName: "Lovelace" })).toBe("Ada Lovelace");
    expect(personLabel({ email: "a@example.com", firstName: null, lastName: null })).toBe("a@example.com");
  });
});
