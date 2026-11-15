import { desc, eq } from "drizzle-orm";
import { validateLeave, type LeaveFields } from "../domain/people/leaveRules";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";

// UC09 / FR-07: a person's own leave, separate from public holidays (sean, 15 Nov 2026).
// Leave is never deleted: cancelling keeps the record, and the planner ignores cancelled leave.

export type LeaveResult = { ok: true; id: number } | { ok: false; errors: string[] };

export interface LeaveRow {
  id: number;
  startDate: string;
  endDate: string;
  type: string;
  dayFraction: number;
  status: "Booked" | "Cancelled";
}

/** Newest first. */
export async function listLeave(db: Db, email: string): Promise<LeaveRow[]> {
  const rows = await db.select().from(t.absences).where(eq(t.absences.personEmail, email)).orderBy(desc(t.absences.startDate));
  return rows.map(({ id, startDate, endDate, type, dayFraction, status }) => ({ id, startDate, endDate, type, dayFraction, status }));
}

export async function addLeave(db: Db, actor: string, request: LeaveFields & { email: string }): Promise<LeaveResult> {
  const errors = validateLeave(request);
  if (errors.length) return { ok: false, errors };
  if (!(await db.query.people.findFirst({ where: eq(t.people.email, request.email) }))) {
    return { ok: false, errors: [`Unknown person ${request.email}`] };
  }
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(t.absences).values({
      personEmail: request.email, startDate: request.startDate, endDate: request.endDate,
      type: request.type, dayFraction: request.dayFraction, status: "Booked", source: "Entered in the app",
    }).returning();
    await tx.insert(t.auditLog).values({
      actor, entity: "absences", entityId: String(row!.id), action: "add", reason: `${request.type} for ${request.email}`, before: null, after: row,
    });
    return { ok: true as const, id: row!.id };
  });
}

export async function cancelLeave(db: Db, actor: string, request: { id: number }): Promise<LeaveResult> {
  const before = await db.query.absences.findFirst({ where: eq(t.absences.id, request.id) });
  if (!before) return { ok: false, errors: ["This leave no longer exists"] };
  await db.transaction(async (tx) => {
    const [after] = await tx.update(t.absences).set({ status: "Cancelled" }).where(eq(t.absences.id, request.id)).returning();
    await tx.insert(t.auditLog).values({
      actor, entity: "absences", entityId: String(request.id), action: "cancel", reason: "Leave cancelled", before, after,
    });
  });
  return { ok: true, id: request.id };
}
