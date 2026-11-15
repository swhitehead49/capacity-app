// Team attributes from the original workbook's Teams sheet (sean, 15 Nov 2026). Pure checks; empty list = fine.

export const ID_STATUSES = ["Provisional", "Confirmed"] as const;

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
}

export const TEAM_DETAIL_FIELDS = [
  "parentTeamName", "parentTeamLeadEmail", "grandparentTeamName", "grandparentTeamLeadEmail",
  "topLevelGroup", "topLevelLeadEmail", "sourceHeadcount", "idStatus", "dataQualityFlag",
] as const satisfies readonly (keyof TeamDetails)[];

export function emptyTeamDetails(): TeamDetails {
  return {
    parentTeamName: null, parentTeamLeadEmail: null, grandparentTeamName: null, grandparentTeamLeadEmail: null,
    topLevelGroup: null, topLevelLeadEmail: null, sourceHeadcount: null, idStatus: "Provisional", dataQualityFlag: null,
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
  return errors;
}

/** A headcount typed in a form or a spreadsheet: blank = none; anything else that isn't a number stays NaN so it fails the check. */
export function readHeadcount(raw: string): number | null {
  const text = raw.trim();
  return text === "" ? null : Number(text);
}
