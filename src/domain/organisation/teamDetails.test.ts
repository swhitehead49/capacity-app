import { describe, expect, it } from "vitest";
import { ID_STATUSES, emptyTeamDetails, validateTeamDetails } from "./teamDetails";

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
});
