import { csvRows, toIsoDate } from "../shared/csv";
import { sameName, validateTeam, type TeamDraft } from "./teamRules";

// Import teams from a spreadsheet saved as CSV (sean, 15 Nov 2026). Pure: the file's text in, teams or problems out.
// Same rules as Add team (FR-18, BR-15, BR-16). Any problem means nothing is imported.

export interface TeamCsvRow extends TeamDraft {
  line: number;
}

export interface TeamCsvResult {
  teams: TeamDraft[];
  rows: TeamCsvRow[]; // the same teams with their line numbers, for messages about clashes with existing teams
  errors: string[];
}

const HEADINGS = 'The first line must have the headings "team_id" and "name" (optional: value_stream, lead_email, start_date, base_location)';

export function parseTeamCsv(text: string, options: { today: string }): { teams: TeamDraft[]; errors: string[] } {
  const result = readTeamCsv(text, options);
  return { teams: result.teams, errors: result.errors };
}

/** Like parseTeamCsv, but keeps each team's line number. */
export function readTeamCsv(text: string, { today }: { today: string }): TeamCsvResult {
  const rows = csvRows(text);
  const header = rows.shift()?.cells.map((c) => c.toLowerCase()) ?? [];
  const col = (name: string) => header.indexOf(name);
  const c = { id: col("team_id"), name: col("name"), valueStream: col("value_stream"), lead: col("lead_email"), start: col("start_date"), base: col("base_location") };
  if (c.id < 0 || c.name < 0) return { teams: [], rows: [], errors: [HEADINGS] };

  const cell = (cells: string[], index: number) => (index < 0 ? "" : cells[index] ?? "");
  const teams: TeamCsvRow[] = [];
  const errors: string[] = [];
  for (const { number, cells } of rows) {
    const rawStart = cell(cells, c.start);
    const start = rawStart ? toIsoDate(rawStart) : today;
    const team: TeamCsvRow = {
      line: number,
      id: cell(cells, c.id),
      name: cell(cells, c.name),
      valueStream: cell(cells, c.valueStream) || null,
      leadEmail: cell(cells, c.lead) || null,
      baseLocation: cell(cells, c.base).trim() || null,
      effectiveFrom: start ?? "",
    };
    const problems = start ? validateTeam(team) : [`"${rawStart}" is not a real date (use YYYY-MM-DD or DD/MM/YYYY)`];
    const sameId = teams.find((x) => x.id.toLowerCase() === team.id.toLowerCase());
    const sameNameInStream = teams.find((x) => sameName(x.name, team.name) && (x.valueStream ?? "") === (team.valueStream ?? ""));
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
