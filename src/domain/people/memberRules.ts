import type { IsoDate } from "../capacity/workingWindow";

// FR-03, FR-05, BR-21, BR-22. Pure checks; each returns a list of plain-English problems (empty = fine).

export interface PersonFields {
  email: string;
  contractedHours: number | null;
  employmentStart: IsoDate | null;
  employmentEnd: IsoDate | null;
}

export interface MembershipFields {
  teamAllocation: number | null; // 0.5 = 50%
  startDate: IsoDate;
}

/** Blanks are allowed: an incomplete person is saved and flagged (FR-04). Wrong values are not. */
export function validatePerson(person: PersonFields): string[] {
  const errors: string[] = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email)) errors.push("Email must look like name@company.com");
  const hours = person.contractedHours;
  if (hours !== null && (!Number.isFinite(hours) || hours < 1 || hours > 60)) errors.push("Contracted hours must be between 1 and 60");
  if (person.employmentStart && person.employmentEnd && person.employmentEnd < person.employmentStart) {
    errors.push("Employment end must be on or after its start");
  }
  return errors;
}

export function validateMembership(membership: MembershipFields): string[] {
  const errors: string[] = [];
  const share = membership.teamAllocation;
  if (share === null) errors.push("Team % is needed");
  else if (!Number.isFinite(share) || share <= 0 || share > 1) errors.push("Team % must be more than 0 and at most 100");
  if (!membership.startDate) errors.push("Start date is needed");
  return errors;
}

export function validateEndDate(membership: { startDate: IsoDate | null; endDate: IsoDate }): string[] {
  if (!membership.endDate) return ["End date is needed"];
  if (membership.startDate && membership.endDate < membership.startDate) {
    return [`End date must be on or after the start date (${formatDay(membership.startDate)})`];
  }
  return [];
}

/** BR-22: a move ends the old membership the day before the new one starts. */
export function dayBefore(date: IsoDate): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function formatDay(date: IsoDate): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
}
