import { and, gte, isNull, or, eq } from "drizzle-orm";
import { parseMemberCsv } from "../domain/people/memberCsv";
import { personLabel } from "../domain/people/memberRules";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";
import { listProjectTeams } from "./projectValueStreams";
import { memberLocationFor } from "../domain/organisation/baseCountry";

// FR-05b (sean, 22 Nov 2026): import team members into a project from the template's Team Members sheet saved as CSV.
// Same rules as Add member (FR-05, BR-21); the team must be one of the project's teams. Any problem means nothing is
// imported (one transaction). A new person's details come from the file; someone already in the project keeps theirs.

export type MemberImportResult = { ok: true; count: number } | { ok: false; errors: string[] };

export async function importMembers(db: Db, actor: string, request: { csv: string; today: string }): Promise<MemberImportResult> {
  const { members, errors } = parseMemberCsv(request.csv, { today: request.today });
  if (errors.length) return { ok: false, errors };

  const teams = new Map((await listProjectTeams(db, request.today)).map((x) => [x.id.toLowerCase(), x]));
  const baseLocations = new Map((await db.select({ id: t.teams.id, base: t.teams.baseLocation }).from(t.teams)).map((x) => [x.id, x.base]));
  const places = await db.select({ code: t.locations.code, country: t.locations.country }).from(t.locations);
  const locations = new Set(places.map((l) => l.code));
  const people = new Set((await db.select({ email: t.people.email }).from(t.people)).map((p) => p.email));
  const problems: string[] = [];
  for (const m of members) {
    const team = teams.get(m.teamId.toLowerCase());
    if (!team) { problems.push(`Line ${m.line}: ${m.teamId} is not one of this project's teams`); continue; }
    m.teamId = team.id;
    // FR-18t: blank = the only location in the team's country; otherwise it is left for the manager to pick.
    m.person.locationCode ??= memberLocationFor(baseLocations.get(team.id) ?? null, places);
    if (!people.has(m.email) && m.person.locationCode && !locations.has(m.person.locationCode)) {
      problems.push(`Line ${m.line}: Unknown location ${m.person.locationCode}`);
    }
    const clash = await db.query.assignments.findFirst({
      where: and(
        eq(t.assignments.personEmail, m.email), eq(t.assignments.teamId, team.id),
        or(isNull(t.assignments.endDate), gte(t.assignments.endDate, m.startDate)),
      ),
    });
    if (clash) problems.push(`Line ${m.line}: ${personLabel({ email: m.email, ...m.person })} is already a member of ${team.id}`);
  }
  if (problems.length) return { ok: false, errors: problems };

  await db.transaction(async (tx) => {
    const added = new Set<string>();
    for (const m of members) {
      if (!people.has(m.email) && !added.has(m.email)) {
        await tx.insert(t.people).values({ email: m.email, ...m.person });
        added.add(m.email);
      }
      const [row] = await tx.insert(t.assignments).values({
        personEmail: m.email, teamId: m.teamId, teamAllocation: m.teamAllocation,
        sharedResource: m.sharedResource, startDate: m.startDate, endDate: m.endDate,
      }).returning();
      await tx.insert(t.auditLog).values({
        actor, entity: "assignments", entityId: String(row!.id), action: "import", reason: "Imported team member", before: null, after: row,
      });
    }
  });
  return { ok: true, count: members.length };
}
