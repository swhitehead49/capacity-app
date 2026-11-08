import { validateSplit, type Split } from "./allocation";

export interface OverrideDraft {
  status: "Draft" | "Active" | "Retired";
  overhead: number | null; // null = inherit (BR-06)
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
  return [...problems, ...validateSplit(draft.split)];
}
