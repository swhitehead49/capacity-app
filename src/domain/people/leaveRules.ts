// UC09 / FR-07: a person's own leave, separate from public holidays (sean, 15 Nov 2026). Pure checks.

export const LEAVE_TYPES = ["Annual leave", "Sick leave", "Parental leave", "Other"] as const;

export interface LeaveFields {
  startDate: string;
  endDate: string;
  type: string;
  dayFraction: number; // 1 = full days, 0.5 = half days
}

/** Returns plain-English problems; an empty list means the leave can be saved. */
export function validateLeave(leave: LeaveFields): string[] {
  const errors: string[] = [];
  if (!leave.startDate) errors.push("Start date is needed");
  if (!leave.endDate) errors.push("End date is needed");
  if (leave.startDate && leave.endDate && leave.endDate < leave.startDate) errors.push("End date can't be before the start date");
  if (leave.dayFraction !== 1 && leave.dayFraction !== 0.5) errors.push("Choose full days or half days");
  if (!(LEAVE_TYPES as readonly string[]).includes(leave.type)) errors.push(`Type must be one of: ${LEAVE_TYPES.join(", ")}`);
  return errors;
}
