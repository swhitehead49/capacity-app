import { validateSplit, type Split } from "./allocation";

export interface TeamDefaultDraft {
  status: "Draft" | "Active" | "Retired";
  effectiveFrom: string | null;
  overhead: number | null;
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
  if (draft.overhead === null) problems.push("An Active default needs an overhead %");
  else if (draft.overhead < 0 || draft.overhead > 1) problems.push("Overhead must be between 0% and 100%");
  return [...problems, ...validateSplit(draft.split)];
}
