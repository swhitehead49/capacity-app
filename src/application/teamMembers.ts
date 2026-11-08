import { and, asc, eq, gte, isNull, or } from "drizzle-orm";
import type { IsoDate } from "../domain/capacity/workingWindow";
import { checkInputs, type InputStatus } from "../domain/capacity/teamCapacity";
import { dayBefore, validateEndDate, validateMembership, validatePerson } from "../domain/people/memberRules";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";
import type { SaveResult } from "./saveTeamDefault";

// UC06 / UC07, FR-05, BR-14, BR-21, BR-22: team membership changes apply at once and are logged.

export interface PersonDetails {
  role: string | null;
  locationCode: string | null;
  contractedHours: number | null;
  employmentStart: IsoDate | null;
  employmentEnd: IsoDate | null;
}

export interface MemberRow extends PersonDetails {
  assignmentId: number;
  teamId: string;
  email: string;
  teamAllocation: number | null;
  sharedResource: boolean;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  inputStatus: InputStatus;
}

const normalise = (email: string) => email.trim().toLowerCase();

/** UC06: a team's members today. Current includes people starting later; past = ended before today. */
export async function getTeamMembers(db: Db, query: { teamId: string; today: IsoDate }) {
  const team = await db.query.teams.findFirst({ where: eq(t.teams.id, query.teamId) });
  if (!team) throw new Error(`Unknown team ${query.teamId}`);
  const rows = await selectMembers(db).where(eq(t.assignments.teamId, query.teamId)).orderBy(asc(t.people.email));
  const members = rows.map(toMemberRow);
  return {
    team,
    current: members.filter((m) => !m.endDate || m.endDate >= query.today),
    past: members.filter((m) => m.endDate && m.endDate < query.today),
  };
}

/** One membership, with the person's details, for the edit page. */
export async function getMember(db: Db, assignmentId: number): Promise<MemberRow | null> {
  const [row] = await selectMembers(db).where(eq(t.assignments.id, assignmentId));
  return row ? toMemberRow(row) : null;
}

export interface AddMemberRequest {
  teamId: string;
  email: string;
  teamAllocation: number | null;
  sharedResource: boolean;
  startDate: IsoDate;
  /** Used only when this is a new person; an existing person's details are kept. */
  person: PersonDetails;
}

/** BR-21: add someone to a team from a start date. Creates the person if they are new. */
export async function addMember(db: Db, actor: string, request: AddMemberRequest): Promise<SaveResult> {
  const email = normalise(request.email);
  const errors = [
    ...validatePerson({ email, ...request.person }),
    ...validateMembership(request),
  ];
  if (errors.length) return { ok: false, errors };

  const existing = await db.query.people.findFirst({ where: eq(t.people.email, email) });
  if (!existing) {
    const locationError = await checkLocation(db, request.person.locationCode);
    if (locationError) return { ok: false, errors: [locationError] };
  }
  const clash = await db.query.assignments.findFirst({
    where: and(
      eq(t.assignments.personEmail, email), eq(t.assignments.teamId, request.teamId),
      or(isNull(t.assignments.endDate), gte(t.assignments.endDate, request.startDate)),
    ),
  });
  if (clash) return { ok: false, errors: [`${email} is already a member of this team`] };

  const id = await db.transaction(async (tx) => {
    if (!existing) await tx.insert(t.people).values({ email, ...request.person });
    const [row] = await tx.insert(t.assignments).values({
      personEmail: email, teamId: request.teamId, teamAllocation: request.teamAllocation,
      sharedResource: request.sharedResource, startDate: request.startDate,
    }).returning();
    await tx.insert(t.auditLog).values({
      actor, entity: "assignments", entityId: String(row!.id), action: "add",
      reason: existing ? "Added existing person to team" : "Added new person to team", before: null, after: row,
    });
    return row!.id;
  });
  return { ok: true, id };
}

/** UC07 edit: change the person's details and this membership's team % and shared flag. */
export async function updateMember(
  db: Db,
  actor: string,
  request: { assignmentId: number; teamAllocation: number | null; sharedResource: boolean; person: PersonDetails },
): Promise<SaveResult> {
  const before = await getMember(db, request.assignmentId);
  if (!before) return { ok: false, errors: ["This membership no longer exists"] };
  const errors = [
    ...validatePerson({ email: before.email, ...request.person }),
    ...validateMembership({ teamAllocation: request.teamAllocation, startDate: before.startDate ?? "open" }),
  ];
  const locationError = await checkLocation(db, request.person.locationCode);
  if (locationError) errors.push(locationError);
  if (errors.length) return { ok: false, errors };

  await db.transaction(async (tx) => {
    await tx.update(t.people).set(request.person).where(eq(t.people.email, before.email));
    await tx.update(t.assignments)
      .set({ teamAllocation: request.teamAllocation, sharedResource: request.sharedResource })
      .where(eq(t.assignments.id, request.assignmentId));
    const after = { ...before, ...request.person, teamAllocation: request.teamAllocation, sharedResource: request.sharedResource };
    await tx.insert(t.auditLog).values({
      actor, entity: "assignments", entityId: String(request.assignmentId), action: "edit",
      reason: "Edited team member", before: stripStatus(before), after: stripStatus(after),
    });
  });
  return { ok: true, id: request.assignmentId };
}

/** BR-22: end a membership on a date. Nothing is deleted. */
export async function endMember(db: Db, actor: string, request: { assignmentId: number; endDate: IsoDate }): Promise<SaveResult> {
  const before = await db.query.assignments.findFirst({ where: eq(t.assignments.id, request.assignmentId) });
  if (!before) return { ok: false, errors: ["This membership no longer exists"] };
  const errors = validateEndDate({ startDate: before.startDate, endDate: request.endDate });
  if (errors.length) return { ok: false, errors };

  await db.transaction(async (tx) => {
    const [after] = await tx.update(t.assignments).set({ endDate: request.endDate })
      .where(eq(t.assignments.id, request.assignmentId)).returning();
    await tx.insert(t.auditLog).values({
      actor, entity: "assignments", entityId: String(before.id), action: "end", reason: "Ended team membership", before, after,
    });
  });
  return { ok: true, id: before.id };
}

/**
 * BR-22: move to another team on a date. The old membership ends the day before,
 * so no day is counted on both teams. Team % carries over unless a new one is given.
 */
export async function moveMember(
  db: Db,
  actor: string,
  request: { assignmentId: number; toTeamId: string; date: IsoDate; teamAllocation: number | null },
): Promise<SaveResult> {
  const before = await db.query.assignments.findFirst({ where: eq(t.assignments.id, request.assignmentId) });
  if (!before) return { ok: false, errors: ["This membership no longer exists"] };
  if (request.toTeamId === before.teamId) return { ok: false, errors: ["Pick a different team to move to"] };
  const team = await db.query.teams.findFirst({ where: eq(t.teams.id, request.toTeamId) });
  if (!team) return { ok: false, errors: [`Unknown team ${request.toTeamId}`] };
  if (!request.date) return { ok: false, errors: ["Move date is needed"] };
  const teamAllocation = request.teamAllocation ?? before.teamAllocation;
  const errors = [
    ...validateEndDate({ startDate: before.startDate, endDate: dayBefore(request.date) })
      .map(() => "The move date must be after this membership started"),
    ...validateMembership({ teamAllocation, startDate: request.date }),
  ];
  if (errors.length) return { ok: false, errors };

  const id = await db.transaction(async (tx) => {
    const [ended] = await tx.update(t.assignments).set({ endDate: dayBefore(request.date) })
      .where(eq(t.assignments.id, before.id)).returning();
    const [started] = await tx.insert(t.assignments).values({
      personEmail: before.personEmail, teamId: request.toTeamId, teamAllocation,
      sharedResource: before.sharedResource, startDate: request.date,
    }).returning();
    const reason = `Moved from ${before.teamId} to ${request.toTeamId}`;
    await tx.insert(t.auditLog).values([
      { actor, entity: "assignments", entityId: String(before.id), action: "move", reason, before, after: ended },
      { actor, entity: "assignments", entityId: String(started!.id), action: "move", reason, before: null, after: started },
    ]);
    return started!.id;
  });
  return { ok: true, id };
}

async function checkLocation(db: Db, code: string | null): Promise<string | null> {
  if (!code) return null;
  const location = await db.query.locations.findFirst({ where: eq(t.locations.code, code) });
  return location ? null : `Unknown location ${code}`;
}

function selectMembers(db: Db) {
  return db.select().from(t.assignments)
    .innerJoin(t.people, eq(t.assignments.personEmail, t.people.email))
    .leftJoin(t.locations, eq(t.people.locationCode, t.locations.code))
    .$dynamic();
}

type JoinedRow = Awaited<ReturnType<ReturnType<typeof selectMembers>["execute"]>>[number];

function toMemberRow({ assignments: a, people: p, locations: loc }: JoinedRow): MemberRow {
  return {
    assignmentId: a.id, teamId: a.teamId, email: p.email, role: p.role, locationCode: p.locationCode,
    contractedHours: p.contractedHours, employmentStart: p.employmentStart, employmentEnd: p.employmentEnd,
    teamAllocation: a.teamAllocation, sharedResource: a.sharedResource, startDate: a.startDate, endDate: a.endDate,
    inputStatus: checkInputs({
      active: p.active,
      location: loc ? { country: loc.country, region: loc.code } : null,
      contractedHours: p.contractedHours,
      standardHours: loc?.standardHours ?? null,
      teamAllocation: a.teamAllocation,
    }),
  };
}

function stripStatus({ inputStatus: _status, ...rest }: MemberRow) {
  return rest;
}
