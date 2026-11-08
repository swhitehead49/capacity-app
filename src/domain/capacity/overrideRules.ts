import { validateSplit, type Split } from "./allocation";

export interface OverrideDraft {
  status: "Draft" | "Active" | "Retired";
  overhead: number | null; // null = inherit (BR-06)
  contingency?: number | null; // null = inherit
  split: Split;
  reason: string;
}

/** BR-01, BR-02, BR-04: problems that stop an override being saved. Drafts may be unfinished. */
export function validateOverride(draft: OverrideDraft): string[] {
  if (draft.status !== "Active") return [];
  const problems: string[] = [];
  if (!draft.reason.trim()) problems.push("An Active override needs a reason");
  if (draft.overhead !== null && (draft.overhead < 0 || draft.overhead > 1)) {
    problems.push("Overhead must be between 0% and 100%");
  }
  const c = draft.contingency;
  if (c !== null && c !== undefined && (!Number.isFinite(c) || c < 0 || c > 1)) problems.push("Contingency must be between 0% and 100%");
  return [...problems, ...validateSplit(draft.split)];
}
