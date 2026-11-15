import { inArray } from "drizzle-orm";
import { readTeamCsv } from "../domain/organisation/teamCsv";
import { nameClashes } from "../domain/organisation/teamRules";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";
import { getStandardAllocation } from "./standardAllocation";
import { insertTeam, knownLocations, liveTeams } from "./teams";

// Import teams from a spreadsheet saved as CSV (sean, 15 Nov 2026).
// Every team gets the same checks as Add team. Any problem means nothing is imported (one transaction).

export type ImportResult = { ok: true; count: number; warnings: string[] } | { ok: false; errors: string[] };

export async function importTeams(db: Db, actor: string, request: { csv: string; today: string }): Promise<ImportResult> {
  const { rows, errors } = readTeamCsv(request.csv, { today: request.today });
  if (errors.length) return { ok: false, errors };

  const used = new Set((await db.select({ id: t.teams.id }).from(t.teams)
    .where(inArray(t.teams.id, rows.map((r) => r.id)))).map((r) => r.id.toLowerCase()));
  const live = await liveTeams(db);
  const locations = await knownLocations(db);
  const problems: string[] = [];
  const warnings: string[] = [];
  for (const row of rows) {
    if (used.has(row.id.toLowerCase())) { problems.push(`Line ${row.line}: Team ID ${row.id} is already used`); continue; }
    if (row.baseLocation && !locations.has(row.baseLocation)) problems.push(`Line ${row.line}: Unknown base location ${row.baseLocation}`);
    const clash = nameClashes(row.name, row.valueStream, live);
    problems.push(...clash.errors.map((e) => `Line ${row.line}: ${e}`));
    warnings.push(...clash.warnings.map((w) => `Line ${row.line}: ${w}`));
  }
  if (problems.length) return { ok: false, errors: problems };

  const standard = await getStandardAllocation(db);
  await db.transaction(async (tx) => {
    for (const { line: _line, ...team } of rows) await insertTeam(tx, actor, team, standard);
  });
  return { ok: true, count: rows.length, warnings };
}
