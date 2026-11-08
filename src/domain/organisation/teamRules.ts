// FR-18, BR-15, BR-16: pure checks for team records. Each returns plain-English problems (empty = fine).

export interface TeamDraft {
  id: string;
  name: string;
  valueStream: string | null;
  leadEmail: string | null;
  effectiveFrom: string;
}

export function validateTeam(team: TeamDraft): string[] {
  const errors: string[] = [];
  if (!/^[A-Za-z0-9-]+$/.test(team.id.trim())) errors.push("Team ID is needed (letters, digits and - only)");
  if (!team.name.trim()) errors.push("Name is needed");
  if (!team.effectiveFrom) errors.push("Start date is needed");
  if (team.leadEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(team.leadEmail)) errors.push("Lead email must look like name@company.com");
  return errors;
}

/** BR-16: names compare without caring about capitals or extra spaces. */
export function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** BR-16: a clash in the same parent is an error; the same name elsewhere is only a warning. */
export function nameClashes(
  name: string,
  valueStream: string | null,
  others: { name: string; valueStream: string | null }[],
): { errors: string[]; warnings: string[] } {
  const matches = others.filter((o) => sameName(o.name, name));
  const inStream = matches.find((o) => (o.valueStream ?? "") === (valueStream ?? ""));
  if (inStream) return { errors: [`"${name.trim()}" is already a team in ${valueStream ?? "(no value stream)"}`], warnings: [] };
  return { errors: [], warnings: matches.map((o) => `"${name.trim()}" is also a team in ${o.valueStream ?? "(no value stream)"}`) };
}
