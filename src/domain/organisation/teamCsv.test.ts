import { describe, expect, it } from "vitest";
import { parseTeamCsv } from "./teamCsv";

// Import teams from a spreadsheet saved as CSV (sean, 15 Nov 2026). Same rules as Add team (FR-18, BR-15, BR-16).
// The headings are those of the original workbook's Teams sheet, plus Value_Stream and Base_Location.
// Any problem means nothing is imported, and every problem is listed with its line number.

const today = "2026-11-15";
const workbook = "Team_ID,Team_Name,Team_Lead_Email,Parent_Team_Name,Parent_Team_Lead_Email,Grandparent_Team_Name,Grandparent_Team_Lead_Email,"
  + "Top_Level_Group,Top_Level_Lead_Email,Source_Headcount,ID_Status,Data_Quality_Flag,Value_Stream,Base_Location";
const head = "team_id,team_name,value_stream,team_lead_email,start_date";

describe("parseTeamCsv", () => {
  it("reads the workbook's Teams headings, plus Value_Stream and Base_Location", () => {
    const csv = `${workbook}\nT074,Payments Core,lead@example.com,Clinical Services,p@example.com,ORBIS Vienna,g@example.com,ORBIS,t@example.com,5,Confirmed,Multiple team leads,Platform,DE-BY\n`;
    expect(parseTeamCsv(csv, { today })).toEqual({
      teams: [{
        id: "T074", name: "Payments Core", leadEmail: "lead@example.com", valueStream: "Platform", baseLocation: "DE-BY", effectiveFrom: today,
        parentTeamName: "Clinical Services", parentTeamLeadEmail: "p@example.com",
        grandparentTeamName: "ORBIS Vienna", grandparentTeamLeadEmail: "g@example.com",
        topLevelGroup: "ORBIS", topLevelLeadEmail: "t@example.com",
        idStatus: "Confirmed", dataQualityFlag: "Multiple team leads", teamType: null,
        teamLeadFirstName: null, teamLeadLastName: null, parentTeamLeadFirstName: null, parentTeamLeadLastName: null, grandparentTeamLeadFirstName: null, grandparentTeamLeadLastName: null, topLevelLeadFirstName: null, topLevelLeadLastName: null,
      }],
      errors: [],
    });
  });

  it("blank optional cells are empty, and a blank ID status means Provisional", () => {
    const csv = `${workbook}\nT074,Payments Core,,,,,,,,,,,,\n`;
    expect(parseTeamCsv(csv, { today }).teams[0]).toMatchObject({
      leadEmail: null, parentTeamName: null, idStatus: "Provisional", dataQualityFlag: null, valueStream: null, baseLocation: null,
    });
  });

  it("FR-18p: reads each lead's first and last name", () => {
    const csv = "Team_ID,Team_Name,Team_Lead_First_Name,Team_Lead_Last_Name,Parent_Team_Lead_First_Name,Parent_Team_Lead_Last_Name,"
      + "Grandparent_Team_Lead_First_Name,Grandparent_Team_Lead_Last_Name,Top_Level_Lead_First_Name,Top_Level_Lead_Last_Name\n"
      + "T074,Payments Core, Ada ,Lovelace,Grace,Hopper,Alan,Turing,Edsger,\n";
    expect(parseTeamCsv(csv, { today }).teams[0]).toMatchObject({
      teamLeadFirstName: "Ada", teamLeadLastName: "Lovelace", parentTeamLeadFirstName: "Grace", parentTeamLeadLastName: "Hopper",
      grandparentTeamLeadFirstName: "Alan", grandparentTeamLeadLastName: "Turing", topLevelLeadFirstName: "Edsger", topLevelLeadLastName: null,
    });
  });

  it("FR-18o: reads Team_Type in any case, and rejects an unknown type", () => {
    const csv = "Team_ID,Team_Name,Team_Type\nT074,Payments Core,mission team\nT075,Billing,\nT076,Viewer,domain\n";
    expect(parseTeamCsv(csv, { today }).teams.map((x) => x.teamType)).toEqual(["Mission Team", null, "Domain Team"]);
    expect(parseTeamCsv(`${csv}T077,Archive,Squad\n`, { today }).errors)
      .toEqual(["Line 5: Team type must be Mission Team, Domain Team or Enabling Team"]);
  });

  it("only needs Team_ID and Team_Name; headings can be in any order, any case, with spaces; DD/MM/YYYY works", () => {
    const csv = "team name,Team ID,Start_Date,Base Location\n\"Payments, Core\",T074,16/11/2026,DE-BY\n";
    expect(parseTeamCsv(csv, { today }).teams).toEqual([
      expect.objectContaining({ id: "T074", name: "Payments, Core", effectiveFrom: "2026-11-16", baseLocation: "DE-BY" }),
    ]);
  });

  it("still reads the shorter headings name and lead_email", () => {
    const csv = "team_id,name,lead_email\nT074,Payments Core,lead@example.com\n";
    expect(parseTeamCsv(csv, { today }).teams[0]).toMatchObject({ name: "Payments Core", leadEmail: "lead@example.com" });
  });

  it("ignores columns it doesn't know, such as Team_Display", () => {
    const csv = "Team_ID,Team_Name,Team_Display\nT074,Payments Core,T074 | Payments Core\n";
    expect(parseTeamCsv(csv, { today }).errors).toEqual([]);
  });

  it("says which headings are missing", () => {
    expect(parseTeamCsv("id,team\nT1,A\n", { today }).errors)
      .toEqual(['The first line must have the headings "Team_ID" and "Team_Name"']);
  });

  it("lists every bad line and imports nothing", () => {
    const csv = `${workbook}\nT074,,,,,,,,,,,,,\nT075,Viewer,not-an-email,,,,,,,,,,,\nT076,Core,,,,,,,,lots,,,,\nT077,Core 2,,,,,,,,,Maybe,,,\n`;
    const result = parseTeamCsv(csv, { today });
    expect(result.teams).toEqual([]);
    expect(result.errors).toEqual([
      "Line 2: Name is needed",
      "Line 3: Lead email must look like name@company.com",
      "Line 5: ID status must be Provisional or Confirmed",
    ]);
  });

  it("FR-18w: ignores a Source_Headcount column; the headcount comes from the team's members", () => {
    const team = parseTeamCsv(`${workbook}\nT074,Core,,,,,,,,lots,,,,\n`, { today }).teams[0];
    expect(team).toBeDefined();
    expect(team).not.toHaveProperty("sourceHeadcount");
  });

  // FR-18x (sean, 22 Nov 2026): the template's % columns become the team's starting default, instead of the standard.
  describe("starting allocation (FR-18x)", () => {
    const pctHead = "Team_ID,Team_Name,Overhead_Pct,Contingency_Pct,Run_Pct,Fix_Pct,Sustain_Pct,Change_Pct,Enabling_Training_Pct,Total_Pct";

    it("reads the % columns as the team's starting allocation; Total_Pct is ignored", () => {
      const team = parseTeamCsv(`${pctHead}\nT074,Core,20,5,25,20,15,10,5,100\n`, { today }).teams[0];
      // An old file's Run_Pct and Fix_Pct are added together as Maintenance (sean, 26 Nov 2026).
      expect(team?.allocation).toEqual({ overhead: 0.2, contingency: 0.05, split: { run: 0.45, fix: 0, sustain: 0.15, change: 0.1, enabling: 0.05 } });
    });

    it("reads the new headings (sean, 26 Nov 2026): Organisational, Unplanned, Maintenance, Technical improvements", () => {
      const head = "Team_ID,Team_Name,Organisational_Pct,Unplanned_Pct,Maintenance_Pct,Technical_Improvements_Pct,Change_Pct,Enabling_Training_Pct";
      expect(parseTeamCsv(`${head}\nT074,Core,20,5,45,15,10,5\n`, { today }).teams[0]?.allocation)
        .toEqual({ overhead: 0.2, contingency: 0.05, split: { run: 0.45, fix: 0, sustain: 0.15, change: 0.1, enabling: 0.05 } });
    });

    it("all blank means none: the team takes the standard allocation", () => {
      expect(parseTeamCsv(`${pctHead}\nT074,Core,,,,,,,,\n`, { today }).teams[0]?.allocation).toBeUndefined();
      expect(parseTeamCsv(`Team_ID,Team_Name\nT074,Core\n`, { today }).teams[0]?.allocation).toBeUndefined();
    });

    it("once any % is filled, a blank one counts as 0% and they must add up to 100%", () => {
      expect(parseTeamCsv(`${pctHead}\nT074,Core,20,,40,40,,,,\n`, { today }).teams[0]?.allocation)
        .toEqual({ overhead: 0.2, contingency: 0, split: { run: 0.8, fix: 0, sustain: 0, change: 0, enabling: 0 } });
      expect(parseTeamCsv(`${pctHead}\nT074,Core,20,,40,30,,,,\nT075,Viewer,20,,40,abc,,,,\n`, { today }).errors).toEqual([
        "Line 2: Organisational + Unplanned + Maintenance + Technical improvements + Change + Enabling/Training must add up to 100% (they add up to 90%)",
        "Line 3: Fix_Pct must be a number",
      ]);
    });
  });

  it("says when a start date is not a real date", () => {
    expect(parseTeamCsv(`${head}\nT076,Core,,,31/02/2027\n`, { today }).errors)
      .toEqual(['Line 2: "31/02/2027" is not a real date (use YYYY-MM-DD or DD/MM/YYYY)']);
  });

  it("refuses the same ID twice, or the same name twice in one value stream (BR-15, BR-16)", () => {
    const csv = `${head}\nT074,Core,Platform,,\nT074,Other,Platform,,\nT075,core,Platform,,\nT076,Core,Radiology,,\n`;
    expect(parseTeamCsv(csv, { today }).errors).toEqual([
      "Line 3: Team ID T074 is also on line 2",
      'Line 4: "core" is also on line 2 in Platform',
    ]);
  });

  it("refuses an empty file", () => {
    expect(parseTeamCsv(`${head}\n`, { today }).errors).toEqual(["The file has no teams in it"]);
  });
});
