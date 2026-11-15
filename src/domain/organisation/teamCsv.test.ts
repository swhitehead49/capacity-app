import { describe, expect, it } from "vitest";
import { parseTeamCsv } from "./teamCsv";

// Import teams from a spreadsheet saved as CSV (sean, 15 Nov 2026). Same rules as Add team (FR-18, BR-15, BR-16).
// Any problem means nothing is imported, and every problem is listed with its line number.

const today = "2026-11-15";
const head = "team_id,name,value_stream,lead_email,start_date";

describe("parseTeamCsv", () => {
  it("reads one team per line; optional columns may be blank, and a blank start date means today", () => {
    const csv = `${head}\nT074,Payments Core,Platform,,2026-11-16\nT075,Imaging Viewer,Radiology,lead@example.com,\n`;
    expect(parseTeamCsv(csv, { today })).toEqual({
      teams: [
        { id: "T074", name: "Payments Core", valueStream: "Platform", leadEmail: null, effectiveFrom: "2026-11-16" },
        { id: "T075", name: "Imaging Viewer", valueStream: "Radiology", leadEmail: "lead@example.com", effectiveFrom: today },
      ],
      errors: [],
    });
  });

  it("only needs team_id and name; headings can be in any order and any case; DD/MM/YYYY works", () => {
    const csv = "Name,Team_ID,Start_Date\n\"Payments, Core\",T074,16/11/2026\n";
    expect(parseTeamCsv(csv, { today }).teams).toEqual([
      { id: "T074", name: "Payments, Core", valueStream: null, leadEmail: null, effectiveFrom: "2026-11-16" },
    ]);
  });

  it("says which headings are missing", () => {
    expect(parseTeamCsv("id,team\nT1,A\n", { today }).errors)
      .toEqual(['The first line must have the headings "team_id" and "name" (optional: value_stream, lead_email, start_date)']);
  });

  it("lists every bad line and imports nothing", () => {
    const csv = `${head}\nT074,,Platform,,\nT075,Viewer,,not-an-email,\nT076,Core,,,31/02/2027\n`;
    const result = parseTeamCsv(csv, { today });
    expect(result.teams).toEqual([]);
    expect(result.errors).toEqual([
      "Line 2: Name is needed",
      "Line 3: Lead email must look like name@company.com",
      'Line 4: "31/02/2027" is not a real date (use YYYY-MM-DD or DD/MM/YYYY)',
    ]);
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
