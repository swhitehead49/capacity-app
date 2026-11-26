import { csvRows, toIsoDate } from "../shared/csv";
import { PCT_COLUMNS, readStartingAllocation, type PctField } from "./startingAllocation";
import { readTeamType, type TeamDetails } from "./teamDetails";
import { sameName, validateTeam, type TeamDraft } from "./teamRules";

// Import teams from a spreadsheet saved as CSV (sean, 15 Nov 2026). Pure: the file's text in, teams or problems out.
// The headings are those of the original workbook's Teams sheet, plus Value_Stream, Base_Location and Start_Date.
// Same rules as Add team (FR-18, BR-15, BR-16). Any problem means nothing is imported.

export interface TeamCsvRow extends TeamDraft {
  line: number;
}

export interface TeamCsvResult {
  teams: TeamDraft[];
  rows: TeamCsvRow[]; // the same teams with their line numbers, for messages about clashes with existing teams
  errors: string[];
}

const HEADINGS = 'The first line must have the headings "Team_ID" and "Team_Name"';

/** Each field and the headings it can have (compared ignoring case, with spaces read as "_"). */
const COLUMNS = {
  id: ["team_id"],
  name: ["team_name", "name"],
  leadEmail: ["team_lead_email", "lead_email"],
  parentTeamName: ["parent_team_name"],
  parentTeamLeadEmail: ["parent_team_lead_email"],
  grandparentTeamName: ["grandparent_team_name"],
  grandparentTeamLeadEmail: ["grandparent_team_lead_email"],
  topLevelGroup: ["top_level_group"],
  topLevelLeadEmail: ["top_level_lead_email"],
  idStatus: ["id_status"],
  dataQualityFlag: ["data_quality_flag"],
  teamType: ["team_type"],
  teamLeadFirstName: ["team_lead_first_name"],
  teamLeadLastName: ["team_lead_last_name"],
  parentTeamLeadFirstName: ["parent_team_lead_first_name"],
  parentTeamLeadLastName: ["parent_team_lead_last_name"],
  grandparentTeamLeadFirstName: ["grandparent_team_lead_first_name"],
  grandparentTeamLeadLastName: ["grandparent_team_lead_last_name"],
  topLevelLeadFirstName: ["top_level_lead_first_name"],
  topLevelLeadLastName: ["top_level_lead_last_name"],
  valueStream: ["value_stream"],
  baseLocation: ["base_location"],
  start: ["start_date"],
  // FR-18x: the starting allocation (Total_Pct is only a check in the spreadsheet, so it is ignored)
  // sean, 26 Nov 2026: new names; the old headings are still read, and an old Fix_Pct is added into Maintenance.
  overhead: ["organisational_pct", "overhead_pct"],
  contingency: ["unplanned_pct", "contingency_pct"],
  run: ["maintenance_pct", "run_pct"],
  fix: ["fix_pct"],
  sustain: ["technical_improvements_pct", "sustain_pct"],
  change: ["change_pct"],
  enabling: ["enabling_training_pct"],
} as const;

export function parseTeamCsv(text: string, options: { today: string }): { teams: TeamDraft[]; errors: string[] } {
  const result = readTeamCsv(text, options);
  return { teams: result.teams, errors: result.errors };
}

/** Like parseTeamCsv, but keeps each team's line number. */
export function readTeamCsv(text: string, { today }: { today: string }): TeamCsvResult {
  const rows = csvRows(text);
  const header = rows.shift()?.cells.map((c) => c.toLowerCase().trim().replace(/\s+/g, "_")) ?? [];
  const c = Object.fromEntries(Object.entries(COLUMNS).map(([field, names]) => [
    field, header.findIndex((h) => (names as readonly string[]).includes(h)),
  ])) as Record<keyof typeof COLUMNS, number>;
  if (c.id < 0 || c.name < 0) return { teams: [], rows: [], errors: [HEADINGS] };

  const teams: TeamCsvRow[] = [];
  const errors: string[] = [];
  for (const { number, cells } of rows) {
    const cell = (field: keyof typeof COLUMNS) => (c[field] < 0 ? "" : cells[c[field]] ?? "").trim();
    const optional = (field: keyof typeof COLUMNS) => cell(field) || null;
    const rawStart = cell("start");
    const start = rawStart ? toIsoDate(rawStart) : today;
    const details: TeamDetails = {
      parentTeamName: optional("parentTeamName"),
      parentTeamLeadEmail: optional("parentTeamLeadEmail"),
      grandparentTeamName: optional("grandparentTeamName"),
      grandparentTeamLeadEmail: optional("grandparentTeamLeadEmail"),
      topLevelGroup: optional("topLevelGroup"),
      topLevelLeadEmail: optional("topLevelLeadEmail"),
      idStatus: cell("idStatus") || "Provisional",
      dataQualityFlag: optional("dataQualityFlag"),
      teamType: readTeamType(cell("teamType")),
      teamLeadFirstName: optional("teamLeadFirstName"),
      teamLeadLastName: optional("teamLeadLastName"),
      parentTeamLeadFirstName: optional("parentTeamLeadFirstName"),
      parentTeamLeadLastName: optional("parentTeamLeadLastName"),
      grandparentTeamLeadFirstName: optional("grandparentTeamLeadFirstName"),
      grandparentTeamLeadLastName: optional("grandparentTeamLeadLastName"),
      topLevelLeadFirstName: optional("topLevelLeadFirstName"),
      topLevelLeadLastName: optional("topLevelLeadLastName"),
    };
    const team: TeamCsvRow = {
      line: number,
      id: cell("id"),
      name: cell("name"),
      leadEmail: optional("leadEmail"),
      valueStream: optional("valueStream"),
      baseLocation: optional("baseLocation"),
      effectiveFrom: start ?? "",
      ...details,
    };
    const starting = readStartingAllocation(Object.fromEntries(PCT_COLUMNS.map(([field]) => [field, cell(field)])) as Record<PctField, string>);
    if (starting.allocation) team.allocation = starting.allocation;
    const problems = start ? [...validateTeam(team), ...starting.errors] : [`"${rawStart}" is not a real date (use YYYY-MM-DD or DD/MM/YYYY)`];
    const sameId = teams.find((x) => x.id.toLowerCase() === team.id.toLowerCase());
    const sameNameInStream = teams.find((x) => sameName(x.name, team.name) && sameName(x.valueStream ?? "", team.valueStream ?? ""));
    if (!problems.length && sameId) problems.push(`Team ID ${team.id} is also on line ${sameId.line}`);
    else if (!problems.length && sameNameInStream) {
      problems.push(`"${team.name}" is also on line ${sameNameInStream.line} in ${team.valueStream ?? "(no value stream)"}`);
    }
    errors.push(...problems.map((p) => `Line ${number}: ${p}`));
    teams.push(team);
  }
  if (rows.length === 0) errors.push("The file has no teams in it");
  if (errors.length) return { teams: [], rows: [], errors };
  return { teams: teams.map(({ line: _line, ...team }) => team), rows: teams, errors: [] };
}
