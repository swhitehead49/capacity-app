/** Shares of a team's available days for each type of work, each between 0 and 1 (BR-01). */
export interface Split {
  run: number;
  fix: number;
  sustain: number;
  change: number;
  enabling?: number; // Enabling/Training (sean, 15 Nov 2026); missing = 0%
}

/**
 * A team default, quarter override or sprint override.
 * One 100% (sean, 15 Nov 2026): overhead + contingency + the five work types add up to 100% of available days,
 * and an Active setting always carries all of them (no inheriting from a less specific setting).
 */
export interface AllocationSetting {
  status: "Draft" | "Active" | "Retired";
  overhead: number | null;
  contingency?: number | null; // blank = 0%
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

/** BR-01 and BR-02. Returns plain-English problems; an empty list means the allocation is valid. */
export function validateAllocation(allocation: { overhead: number | null; contingency?: number | null; split: Split }): string[] {
  if (allocation.overhead === null) return ["Overhead % is needed (it can be 0)"];
  const { split } = allocation;
  const values = [allocation.overhead, allocation.contingency ?? 0, split.run, split.fix, split.sustain, split.change, split.enabling ?? 0];
  const problems: string[] = [];
  const total = values.reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > TOLERANCE) {
    const typed = Math.round(total * 10000) / 100; // 1.2 -> 120
    problems.push(`Overhead + Contingency + Run + Fix + Sustain + Change + Enabling/Training must add up to 100% (they add up to ${typed}%)`);
  }
  if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) problems.push("Every percentage must be between 0% and 100%");
  return problems;
}

/**
 * FR-12: the most specific Active setting wins — sprint, then quarter, then team default — and it supplies
 * every number: overhead, contingency and the split (one 100%, sean 15 Nov 2026).
 * BR-05: Draft and Retired settings are ignored.
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
  const [source, setting] = active[0] ?? [null, null];
  return {
    split: setting?.split ?? null,
    splitSource: source,
    overhead: setting?.overhead ?? null,
    overheadSource: source,
    contingency: setting?.contingency ?? 0,
    contingencySource: source,
  };
}

export interface CapacitySplit {
  engineeringDays: number | null; // available days minus overhead
  contingencyDays: number | null; // available days × contingency %
  run: number | null;
  fix: number | null;
  sustain: number | null;
  change: number | null;
  enabling: number | null;
}

/**
 * Steps 7–8: overhead, contingency and each type of work get their % of the available days.
 * Null when there is no active allocation.
 */
export function splitCapacity(
  availableDays: number,
  allocation: { overhead: number | null; contingency?: number; split: Split | null },
): CapacitySplit {
  const { overhead, split } = allocation;
  if (overhead === null || split === null) {
    return { engineeringDays: null, contingencyDays: null, run: null, fix: null, sustain: null, change: null, enabling: null };
  }
  const share = (fraction: number) => availableDays * fraction;
  return {
    engineeringDays: share(1 - overhead),
    contingencyDays: share(allocation.contingency ?? 0),
    run: share(split.run),
    fix: share(split.fix),
    sustain: share(split.sustain),
    change: share(split.change),
    enabling: share(split.enabling ?? 0),
  };
}
