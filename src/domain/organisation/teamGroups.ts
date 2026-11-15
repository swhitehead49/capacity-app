// sean, 15 Nov 2026: a project's teams are listed grouped by value stream. Pure.

export const NO_VALUE_STREAM = "No value stream";

/** Teams grouped under their value stream (A–Z), with teams that have none last. Order inside a group is kept. */
export function groupByValueStream<T extends { valueStream: string | null }>(teams: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const team of teams) {
    const key = team.valueStream ?? NO_VALUE_STREAM;
    groups.set(key, [...(groups.get(key) ?? []), team]);
  }
  return [...groups.entries()].sort(([a], [b]) =>
    a === NO_VALUE_STREAM ? 1 : b === NO_VALUE_STREAM ? -1 : a.localeCompare(b));
}
