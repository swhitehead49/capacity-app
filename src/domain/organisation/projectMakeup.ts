// sean, 15 Nov 2026: a project's makeup for its home page: the value streams linked to it through its active teams. Pure.

export interface MakeupTeam { valueStream: string | null; members: number; status: string }

export interface ProjectMakeup {
  valueStreams: { name: string; teams: number; members: number }[];
  teamsWithoutValueStream: number;
  error: string | null;
}

export function projectMakeup(teams: MakeupTeam[]): ProjectMakeup {
  const active = teams.filter((t) => !t.status.startsWith("Retired"));
  const byStream = new Map<string, { name: string; teams: number; members: number }>();
  for (const team of active) {
    if (!team.valueStream) continue;
    const row = byStream.get(team.valueStream) ?? { name: team.valueStream, teams: 0, members: 0 };
    byStream.set(team.valueStream, { ...row, teams: row.teams + 1, members: row.members + team.members });
  }
  const valueStreams = [...byStream.values()].sort((a, b) => a.name.localeCompare(b.name));
  return {
    valueStreams,
    teamsWithoutValueStream: active.filter((t) => !t.valueStream).length,
    error: valueStreams.length ? null : "No value streams in the project",
  };
}
