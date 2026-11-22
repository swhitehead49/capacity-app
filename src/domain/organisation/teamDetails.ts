// Team attributes from the original workbook's Teams sheet (sean, 15 Nov 2026). Pure checks; empty list = fine.

export const ID_STATUSES = ["Provisional", "Confirmed"] as const;

/** FR-18o (sean, 22 Nov 2026): what kind of team it is. Optional. */
export const TEAM_TYPES = ["Mission Team", "Domain Team", "Enabling Team"] as const;

export interface TeamDetails {
  parentTeamName: string | null;
  parentTeamLeadEmail: string | null;
  grandparentTeamName: string | null;
  grandparentTeamLeadEmail: string | null;
  topLevelGroup: string | null;
  topLevelLeadEmail: string | null;
  sourceHeadcount: number | null;
  idStatus: string;
  dataQualityFlag: string | null;
  teamType: string | null;
  teamLeadFirstName: string | null;
  teamLeadLastName: string | null;
  parentTeamLeadFirstName: string | null;
  parentTeamLeadLastName: string | null;
  grandparentTeamLeadFirstName: string | null;
  grandparentTeamLeadLastName: string | null;
  topLevelLeadFirstName: string | null;
  topLevelLeadLastName: string | null;
}

/** FR-18p (sean, 22 Nov 2026): every lead in the hierarchy has an optional first and last name beside their email. */
export const LEAD_NAME_FIELDS = [
  "teamLeadFirstName", "teamLeadLastName", "parentTeamLeadFirstName", "parentTeamLeadLastName",
  "grandparentTeamLeadFirstName", "grandparentTeamLeadLastName", "topLevelLeadFirstName", "topLevelLeadLastName",
] as const;

const LEAD_NAME_LABELS: Record<(typeof LEAD_NAME_FIELDS)[number], string> = {
  teamLeadFirstName: "Team lead first name", teamLeadLastName: "Team lead last name",
  parentTeamLeadFirstName: "Parent team lead first name", parentTeamLeadLastName: "Parent team lead last name",
  grandparentTeamLeadFirstName: "Grandparent team lead first name", grandparentTeamLeadLastName: "Grandparent team lead last name",
  topLevelLeadFirstName: "Top-level lead first name", topLevelLeadLastName: "Top-level lead last name",
};

export const TEAM_DETAIL_FIELDS = [
  "parentTeamName", "parentTeamLeadEmail", "grandparentTeamName", "grandparentTeamLeadEmail",
  "topLevelGroup", "topLevelLeadEmail", "sourceHeadcount", "idStatus", "dataQualityFlag", "teamType",
  "teamLeadFirstName", "teamLeadLastName", "parentTeamLeadFirstName", "parentTeamLeadLastName",
  "grandparentTeamLeadFirstName", "grandparentTeamLeadLastName", "topLevelLeadFirstName", "topLevelLeadLastName",
] as const satisfies readonly (keyof TeamDetails)[];

export function emptyTeamDetails(): TeamDetails {
  return {
    parentTeamName: null, parentTeamLeadEmail: null, grandparentTeamName: null, grandparentTeamLeadEmail: null,
    topLevelGroup: null, topLevelLeadEmail: null, sourceHeadcount: null, idStatus: "Provisional", dataQualityFlag: null, teamType: null,
    ...(Object.fromEntries(LEAD_NAME_FIELDS.map((k) => [k, null])) as Record<(typeof LEAD_NAME_FIELDS)[number], null>),
  };
}

export const looksLikeEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function validateTeamDetails(details: TeamDetails): string[] {
  const errors: string[] = [];
  const emails: [string | null, string][] = [
    [details.parentTeamLeadEmail, "Parent team lead email"],
    [details.grandparentTeamLeadEmail, "Grandparent team lead email"],
    [details.topLevelLeadEmail, "Top-level lead email"],
  ];
  for (const [email, label] of emails) if (email && !looksLikeEmail(email)) errors.push(`${label} must look like name@company.com`);
  const n = details.sourceHeadcount;
  if (n !== null && !(Number.isInteger(n) && n >= 0)) errors.push("Source headcount must be a whole number, 0 or more");
  if (!(ID_STATUSES as readonly string[]).includes(details.idStatus)) errors.push("ID status must be Provisional or Confirmed");
  if (details.teamType !== null && !(TEAM_TYPES as readonly string[]).includes(details.teamType)) {
    errors.push("Team type must be Mission Team, Domain Team or Enabling Team");
  }
  for (const field of LEAD_NAME_FIELDS) {
    if ((details[field] ?? "").length > 100) errors.push(`${LEAD_NAME_LABELS[field]} must be at most 100 characters`);
  }
  return errors;
}

/** A lead as shown: "Ada Lovelace (ada@example.com)", or whichever parts are known; "" when none are. */
export function describeLead(firstName: string | null, lastName: string | null, email: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(" ");
  return name && email ? `${name} (${email})` : name || email || "";
}

/** A headcount typed in a form or a spreadsheet: blank = none; anything else that isn't a number stays NaN so it fails the check. */
export function readHeadcount(raw: string): number | null {
  const text = raw.trim();
  return text === "" ? null : Number(text);
}

/** A team type typed in a form or a spreadsheet: any case, "Team" optional; blank = none; anything else stays as typed so the check names it. */
export function readTeamType(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const key = text.toLowerCase().replace(/\s+team$/, "");
  return TEAM_TYPES.find((type) => type.toLowerCase().replace(/ team$/, "") === key) ?? text;
}
