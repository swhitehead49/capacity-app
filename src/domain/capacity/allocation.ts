/** Shares of engineering time, each between 0 and 1, adding up to 1 (BR-01). */
export interface Split {
  run: number;
  fix: number;
  sustain: number;
  change: number;
}

/** A team default, quarter override or sprint override. */
export interface AllocationSetting {
  status: "Draft" | "Active" | "Retired";
  overhead: number | null; // null on an override = inherit (BR-06)
  contingency?: number | null; // held back after overhead; null/missing = inherit, and 0% if nothing sets it
  split: Split;
}

export type AllocationSource = "Team default" | "Quarter override" | "Sprint override";

export interface ResolvedAllocation {
  split: Split | null;
  splitSource: AllocationSource | null;
  overhead: number | null;
  overheadSource: AllocationSource | null;
  contingency: number;
  contingencySource: AllocationSource | null;
}

const TOLERANCE = 0.0001; // BR-01: within 0.01%

/** BR-01 and BR-02. Returns a list of problems; an empty list means the split is valid. */
export function validateSplit(split: Split): string[] {
  const values = [split.run, split.fix, split.sustain, split.change];
  const problems: string[] = [];
  const total = values.reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > TOLERANCE) problems.push("Run + Fix + Sustain + Change must add up to 100%");
  if (values.some((value) => value < 0 || value > 1)) problems.push("Every percentage must be between 0% and 100%");
  return problems;
}

/**
 * FR-12: the most specific Active setting wins — sprint, then quarter, then team default.
 * BR-05: Draft and Retired settings are ignored.
 * BR-06: overhead comes from the most specific Active setting that has one. Contingency works the same way.
 */
export function resolveAllocation(settings: {
  teamDefault?: AllocationSetting;
  quarter?: AllocationSetting;
  sprint?: AllocationSetting;
}): ResolvedAllocation {
  const candidates: [AllocationSource, AllocationSetting | undefined][] = [
    ["Sprint override", settings.sprint],
    ["Quarter override", settings.quarter],
    ["Team default", settings.teamDefault],
  ];
  const active = candidates.filter(
    (entry): entry is [AllocationSource, AllocationSetting] => entry[1]?.status === "Active",
  );
  const forSplit = active[0];
  const forOverhead = active.find(([, setting]) => setting.overhead !== null);
  const forContingency = active.find(([, setting]) => setting.contingency !== null && setting.contingency !== undefined);
  return {
    split: forSplit?.[1].split ?? null,
    splitSource: forSplit?.[0] ?? null,
    overhead: forOverhead?.[1].overhead ?? null,
    overheadSource: forOverhead?.[0] ?? null,
    contingency: forContingency?.[1].contingency ?? 0,
    contingencySource: forContingency?.[0] ?? null,
  };
}

export interface CapacitySplit {
  engineeringDays: number | null; // after overhead
  contingencyDays: number | null; // held back from engineering days, not split
  run: number | null;
  fix: number | null;
  sustain: number | null;
  change: number | null;
}

/**
 * Steps 7–8: take overhead off, hold back the contingency, then split what is left.
 * Null when there is no active allocation.
 */
export function splitCapacity(
  availableDays: number,
  allocation: { overhead: number | null; contingency?: number; split: Split | null },
): CapacitySplit {
  const { overhead, split } = allocation;
  if (overhead === null || split === null) {
    return { engineeringDays: null, contingencyDays: null, run: null, fix: null, sustain: null, change: null };
  }
  const engineeringDays = availableDays * (1 - overhead);
  const contingencyDays = engineeringDays * (allocation.contingency ?? 0);
  const plannable = engineeringDays - contingencyDays;
  return {
    engineeringDays,
    contingencyDays,
    run: plannable * split.run,
    fix: plannable * split.fix,
    sustain: plannable * split.sustain,
    change: plannable * split.change,
  };
}
