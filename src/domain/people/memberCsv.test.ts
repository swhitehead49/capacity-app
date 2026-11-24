import { describe, expect, it } from "vitest";
import { parseMemberCsv } from "./memberCsv";

// FR-05b (sean, 22 Nov 2026): import team members from the template's Team Members sheet saved as CSV.
// Team_ID and Email are needed; the rest is optional. Blank Team_Pct = 100, blank Start_Date = today.

const today = "2026-11-22";
const head = "Team_ID,Team_Name,Email,First_Name,Last_Name,Role,Location,Contracted_Hours,Team_Pct,Shared_Resource,Start_Date,End_Date,Employment_Start,Employment_End";

describe("parseMemberCsv", () => {
  it("reads every column of the Team Members sheet", () => {
    const csv = `${head}\nT202,AIMS U Vienna, Ada@Example.com ,Ada,Lovelace,Developer,AT-9,38.5,50,Yes,01/12/2026,2027-06-30,2020-01-01,\n`;
    expect(parseMemberCsv(csv, { today })).toEqual({
      members: [{
        line: 2, teamId: "T202", email: "ada@example.com", teamAllocation: 0.5, sharedResource: true, startDate: "2026-12-01", endDate: "2027-06-30",
        person: { firstName: "Ada", lastName: "Lovelace", role: "Developer", locationCode: "AT-9", contractedHours: 38.5, employmentStart: "2020-01-01", employmentEnd: null },
      }],
      errors: [],
    });
  });

  it("only needs Team_ID and Email: blank Team_Pct means 100, blank start means today, blank shared means No", () => {
    const csv = "email,team id\nada@example.com,T202\n";
    expect(parseMemberCsv(csv, { today }).members[0]).toMatchObject({
      teamId: "T202", teamAllocation: 1, sharedResource: false, startDate: today, endDate: null,
      person: { firstName: null, lastName: null, role: null, locationCode: null, contractedHours: null },
    });
  });

  it("lists every problem with its line number", () => {
    const csv = `${head}\n,X,bad,,,,,70,150,Maybe,31/02/2027,,,\nT202,X,a@example.com,,,,,,,,2026-12-01,2026-11-01,,\n`;
    expect(parseMemberCsv(csv, { today }).errors).toEqual([
      "Line 2: Team_ID is needed",
      "Line 2: Email must look like name@company.com",
      "Line 2: Contracted hours must be between 1 and 60",
      "Line 2: Team % must be more than 0 and at most 100",
      'Line 2: Shared_Resource must be Yes or No, not "Maybe"',
      'Line 2: "31/02/2027" is not a real date (use YYYY-MM-DD or DD/MM/YYYY)',
      "Line 3: End date must be on or after the start date (1 Dec 2026)",
    ]);
  });

  it("the same person twice on the same team is a problem", () => {
    const csv = "Team_ID,Email\nT202,a@example.com\nt202,A@example.com\n";
    expect(parseMemberCsv(csv, { today }).errors).toEqual(["Line 3: a@example.com is also on line 2 for T202"]);
  });

  it("needs the Team_ID heading, and Email or a name heading", () => {
    expect(parseMemberCsv("Name\nAda\n", { today }).errors).toEqual(['The first line must have the heading "Team_ID", and "Email" or "First_Name"/"Last_Name"']);
  });

  // FR-05c (sean, 24 Nov 2026): emails are optional; without one, a person is matched by name.
  it("a row without an email needs a name, and is keyed by it", () => {
    const csv = "Team_ID,First_Name,Last_Name\nT202,Ada,Lovelace\nT203,ada,LOVELACE\nT202,,\n";
    const result = parseMemberCsv(csv, { today });
    expect(result.errors).toEqual(["Line 4: Email or a name is needed"]);
    const ok = parseMemberCsv("Team_ID,First_Name,Last_Name\nT202,Ada,Lovelace\nT203,ada,LOVELACE\n", { today });
    expect(ok.members.map((m) => m.email)).toEqual(["no-email:ada lovelace", "no-email:ada lovelace"]);
    expect(parseMemberCsv("Team_ID,Email,First_Name\nT202,,Ada\nT202,,ada\n", { today }).errors)
      .toEqual(["Line 3: Ada is also on line 2 for T202"]);
  });
});
