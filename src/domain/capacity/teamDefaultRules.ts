import { validateAllocation, type Split } from "./allocation";

export interface TeamDefaultDraft {
  status: "Draft" | "Active" | "Retired";
  effectiveFrom: string | null;
  overhead: number | null;
  contingency?: number | null; // blank = 0%
  split: Split;
}

/**
 * BR-01, BR-02, BR-03: problems that stop a team default being saved.
 * Drafts may be unfinished; only Active defaults must be complete and valid.
 */
export function validateTeamDefault(draft: TeamDefaultDraft): string[] {
  if (draft.status !== "Active") return [];
  const problems: string[] = [];
  if (!draft.effectiveFrom) problems.push("An Active default needs an effective-from date");
  return [...problems, ...validateAllocation(draft)];
}
