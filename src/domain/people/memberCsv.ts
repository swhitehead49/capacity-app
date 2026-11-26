import { csvRows, toIsoDate } from "../shared/csv";
import { cleanName, personKey, personLabel, validateEndDate, validateMembership, validatePerson } from "./memberRules";

// Import team members from the template's Team Members sheet saved as CSV (FR-05b, sean, 22 Nov 2026).
// Pure: the file's text in, members or problems out. Team_ID is needed, and an Email or a name (FR-05c); the rest is optional.
// A blank Team_Pct means 100, a blank Start_Date means today, a blank Shared_Resource means No.

export interface MemberCsvRow {
  line: number;
  teamId: string;
  email: string; // the person key: their email, or "no-email:" + name (FR-05c)
  teamAllocation: number; // 0.5 = 50%
  sharedResource: boolean;
  startDate: string;
  endDate: string | null;
  person: {
    firstName: string | null; lastName: string | null; role: string | null; locationCode: string | null;
    contractedHours: number | null; employmentStart: string | null; employmentEnd: string | null;
  };
}

const HEADINGS = 'The first line must have the heading "Team_ID", and "Email" or "First_Name"/"Last_Name"';

/** Each field and the headings it can have (compared ignoring case, with spaces read as "_"). */
const COLUMNS = {
  teamId: ["team_id"],
  email: ["email", "employee_email"],
  firstName: ["first_name"],
  lastName: ["last_name"],
  role: ["role"],
  location: ["country", "location", "location_code"], // FR-05e: Country (older files say Location)
  hours: ["contracted_hours"],
  pct: ["team_pct", "team_%"],
  shared: ["shared_resource", "shared"],
  start: ["start_date"],
  end: ["end_date"],
  employmentStart: ["employment_start"],
  employmentEnd: ["employment_end"],
} as const;

export function parseMemberCsv(text: string, { today }: { today: string }): { members: MemberCsvRow[]; errors: string[] } {
  const rows = csvRows(text);
  const header = rows.shift()?.cells.map((c) => c.toLowerCase().trim().replace(/\s+/g, "_")) ?? [];
  const c = Object.fromEntries(Object.entries(COLUMNS).map(([field, names]) => [
    field, header.findIndex((h) => (names as readonly string[]).includes(h)),
  ])) as Record<keyof typeof COLUMNS, number>;
  if (c.teamId < 0 || (c.email < 0 && c.firstName < 0 && c.lastName < 0)) return { members: [], errors: [HEADINGS] };

  const members: MemberCsvRow[] = [];
  const errors: string[] = [];
  for (const { number, cells } of rows) {
    const cell = (field: keyof typeof COLUMNS) => (c[field] < 0 ? "" : cells[c[field]] ?? "").trim();
    const dateProblems: string[] = [];
    const date = (field: keyof typeof COLUMNS) => {
      const raw = cell(field);
      if (!raw) return null;
      const iso = toIsoDate(raw);
      if (!iso) dateProblems.push(`"${raw}" is not a real date (use YYYY-MM-DD or DD/MM/YYYY)`);
      return iso;
    };
    const number_ = (raw: string) => (raw === "" ? null : Number(raw.replace("%", "")));

    const teamId = cell("teamId");
    const typedEmail = cell("email").toLowerCase();
    const pct = number_(cell("pct"));
    const sharedRaw = cell("shared").toLowerCase();
    const person = {
      firstName: cleanName(cell("firstName")), lastName: cleanName(cell("lastName")), role: cell("role") || null,
      locationCode: cell("location") || null, contractedHours: number_(cell("hours")),
      employmentStart: date("employmentStart"), employmentEnd: date("employmentEnd"),
    };
    const start = cell("start") ? date("start") : today;
    const end = date("end");

    const problems: string[] = teamId ? [] : ["Team_ID is needed"];
    problems.push(...validatePerson({ email: typedEmail, ...person }));
    const email = personKey(typedEmail, person.firstName, person.lastName);
    const membership = { teamAllocation: pct === null ? 1 : pct / 100, startDate: start ?? today };
    problems.push(...validateMembership(membership));
    if (!["", "yes", "no", "y", "n", "true", "false"].includes(sharedRaw)) problems.push(`Shared_Resource must be Yes or No, not "${cell("shared")}"`);
    if (end && start) problems.push(...validateEndDate({ startDate: start, endDate: end }));
    const twin = members.find((m) => m.email === email && m.teamId.toLowerCase() === teamId.toLowerCase());
    if (!problems.length && twin) problems.push(`${personLabel({ email: twin.email, ...twin.person })} is also on line ${twin.line} for ${twin.teamId}`);

    problems.push(...dateProblems);
    errors.push(...problems.map((p) => `Line ${number}: ${p}`));
    members.push({
      line: number, teamId, email, teamAllocation: membership.teamAllocation, sharedResource: ["yes", "y", "true"].includes(sharedRaw),
      startDate: start ?? today, endDate: end, person,
    });
  }
  return { members: errors.length ? [] : members, errors };
}
