import { validateAllocation, type Split } from "./allocation";

export interface OverrideDraft {
  status: "Draft" | "Active" | "Retired";
  overhead: number | null; // needed when Active (one 100%, sean 15 Nov 2026)
  contingency?: number | null; // blank = 0%
  split: Split;
  reason: string;
}

/** BR-01, BR-02, BR-04: problems that stop an override being saved. Drafts may be unfinished. */
export function validateOverride(draft: OverrideDraft): string[] {
  if (draft.status !== "Active") return [];
  const problems: string[] = [];
  if (!draft.reason.trim()) problems.push("An Active override needs a reason");
  return [...problems, ...validateAllocation(draft)];
}
