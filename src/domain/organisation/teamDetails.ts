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
}

export const TEAM_DETAIL_FIELDS = [
  "parentTeamName", "parentTeamLeadEmail", "grandparentTeamName", "grandparentTeamLeadEmail",
  "topLevelGroup", "topLevelLeadEmail", "sourceHeadcount", "idStatus", "dataQualityFlag", "teamType",
] as const satisfies readonly (keyof TeamDetails)[];

export function emptyTeamDetails(): TeamDetails {
  return {
    parentTeamName: null, parentTeamLeadEmail: null, grandparentTeamName: null, grandparentTeamLeadEmail: null,
    topLevelGroup: null, topLevelLeadEmail: null, sourceHeadcount: null, idStatus: "Provisional", dataQualityFlag: null, teamType: null,
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
  return errors;
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
