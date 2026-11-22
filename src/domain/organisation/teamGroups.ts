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

type Hierarchy = { name: string; parentTeamName: string | null; grandparentTeamName: string | null };

/** sean, 22 Nov 2026: the master team table's filters. Team Name matches part of the name (any case); the others match exactly. */
export function filterTeams<T extends Hierarchy>(teams: T[], filter: { name?: string; parent?: string; grandparent?: string }): T[] {
  const name = filter.name?.trim().toLowerCase();
  return teams.filter((x) => (!name || x.name.toLowerCase().includes(name))
    && (!filter.parent || x.parentTeamName === filter.parent)
    && (!filter.grandparent || x.grandparentTeamName === filter.grandparent));
}

/** The parent and grandparent team names to pick from in the filters, A–Z. */
export function hierarchyOptions(teams: Hierarchy[]): { parents: string[]; grandparents: string[] } {
  const names = (pick: (x: Hierarchy) => string | null) =>
    [...new Set(teams.map(pick).filter((n): n is string => !!n))].sort((a, b) => a.localeCompare(b));
  return { parents: names((x) => x.parentTeamName), grandparents: names((x) => x.grandparentTeamName) };
}
