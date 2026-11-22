import { validateAllocation } from "../capacity/allocation";

// FR-18x (sean, 22 Nov 2026): a team imported from the template can bring its own starting allocation (the % columns),
// which becomes its first Active team default in every project, instead of the standard allocation.

export interface StartingAllocation {
  overhead: number;
  contingency: number;
  split: { run: number; fix: number; sustain: number; change: number; enabling: number };
}

/** The template's % columns, in order, with their headings. */
export const PCT_COLUMNS = [
  ["overhead", "Overhead_Pct"], ["contingency", "Contingency_Pct"], ["run", "Run_Pct"], ["fix", "Fix_Pct"],
  ["sustain", "Sustain_Pct"], ["change", "Change_Pct"], ["enabling", "Enabling_Training_Pct"],
] as const;

export type PctField = (typeof PCT_COLUMNS)[number][0];

/** The reason saved on a default that came from the import; projects look for it when they copy the team. */
export const IMPORTED_REASON = "Imported starting allocation";

/**
 * Reads the % cells (e.g. "20" or "20%"). All blank = none (the team takes the standard). Once any is filled,
 * a blank one counts as 0%, and together they must add up to 100% (BR-01, one 100%).
 */
export function readStartingAllocation(cells: Record<PctField, string>): { allocation?: StartingAllocation; errors: string[] } {
  if (PCT_COLUMNS.every(([field]) => cells[field].trim() === "")) return { errors: [] };
  const errors: string[] = [];
  const value = {} as Record<PctField, number>;
  for (const [field, heading] of PCT_COLUMNS) {
    const raw = cells[field].trim().replace(/%$/, "").trim();
    const n = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(n)) errors.push(`${heading} must be a number`);
    value[field] = Math.round(n * 100) / 10000; // 25 -> 0.25, without floating-point dust
  }
  if (errors.length) return { errors };
  const allocation: StartingAllocation = {
    overhead: value.overhead, contingency: value.contingency,
    split: { run: value.run, fix: value.fix, sustain: value.sustain, change: value.change, enabling: value.enabling },
  };
  const problems = validateAllocation(allocation);
  return problems.length ? { errors: problems } : { allocation, errors: [] };
}
