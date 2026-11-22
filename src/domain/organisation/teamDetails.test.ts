import { describe, expect, it } from "vitest";
import { ID_STATUSES, LEAD_NAME_FIELDS, describeLead, TEAM_TYPES, emptyTeamDetails, readTeamType, validateTeamDetails } from "./teamDetails";

// Team attributes from the original workbook's Teams sheet (sean, 15 Nov 2026): the parent, grandparent and
// top-level groups with their leads, the source headcount, the ID status and a data quality flag.

describe("validateTeamDetails", () => {
  it("accepts details that are all blank", () => {
    expect(validateTeamDetails(emptyTeamDetails())).toEqual([]);
  });

  it("starts a team's ID as Provisional", () => {
    expect(emptyTeamDetails().idStatus).toBe("Provisional");
    expect(ID_STATUSES).toEqual(["Provisional", "Confirmed"]);
  });

  it("checks each lead email looks right", () => {
    const details = { ...emptyTeamDetails(), parentTeamLeadEmail: "boss", topLevelLeadEmail: "top@example.com" };
    expect(validateTeamDetails(details)).toEqual(["Parent team lead email must look like name@company.com"]);
  });

  it("needs a whole-number headcount of 0 or more, or blank", () => {
    expect(validateTeamDetails({ ...emptyTeamDetails(), sourceHeadcount: 2.5 })).toEqual(["Source headcount must be a whole number, 0 or more"]);
    expect(validateTeamDetails({ ...emptyTeamDetails(), sourceHeadcount: -1 })).toEqual(["Source headcount must be a whole number, 0 or more"]);
    expect(validateTeamDetails({ ...emptyTeamDetails(), sourceHeadcount: 7 })).toEqual([]);
  });

  it("only knows Provisional and Confirmed as ID statuses", () => {
    expect(validateTeamDetails({ ...emptyTeamDetails(), idStatus: "Maybe" })).toEqual(["ID status must be Provisional or Confirmed"]);
  });

  it("FR-18o: team type is blank or Mission Team, Domain Team or Enabling Team", () => {
    expect(TEAM_TYPES).toEqual(["Mission Team", "Domain Team", "Enabling Team"]);
    expect(emptyTeamDetails().teamType).toBeNull();
    expect(validateTeamDetails({ ...emptyTeamDetails(), teamType: "Domain Team" })).toEqual([]);
    expect(validateTeamDetails({ ...emptyTeamDetails(), teamType: "Squad" })).toEqual(["Team type must be Mission Team, Domain Team or Enabling Team"]);
  });
});

describe("lead names (FR-18p, sean 22 Nov 2026)", () => {
  it("each lead (team, parent, grandparent, top-level) has an optional first and last name", () => {
    expect(LEAD_NAME_FIELDS).toEqual([
      "teamLeadFirstName", "teamLeadLastName", "parentTeamLeadFirstName", "parentTeamLeadLastName",
      "grandparentTeamLeadFirstName", "grandparentTeamLeadLastName", "topLevelLeadFirstName", "topLevelLeadLastName",
    ]);
    for (const field of LEAD_NAME_FIELDS) expect(emptyTeamDetails()[field]).toBeNull();
  });

  it("shows a lead by name and email, or whichever is known", () => {
    expect(describeLead("Ada", "Lovelace", "ada@example.com")).toBe("Ada Lovelace (ada@example.com)");
    expect(describeLead(null, "Lovelace", null)).toBe("Lovelace");
    expect(describeLead(null, null, "ada@example.com")).toBe("ada@example.com");
    expect(describeLead(null, null, null)).toBe("");
  });

  it("refuses a lead name longer than 100 characters", () => {
    expect(validateTeamDetails({ ...emptyTeamDetails(), parentTeamLeadLastName: "x".repeat(101) }))
      .toEqual(["Parent team lead last name must be at most 100 characters"]);
  });
});

describe("readTeamType", () => {
  it("FR-18o: reads a team type typed in any case, with or without the word Team; blank is none", () => {
    expect(readTeamType("mission team")).toBe("Mission Team");
    expect(readTeamType(" Domain ")).toBe("Domain Team");
    expect(readTeamType("ENABLING")).toBe("Enabling Team");
    expect(readTeamType("")).toBeNull();
    expect(readTeamType("Squad")).toBe("Squad"); // left as typed so the check can name it
  });
});
