import { eq } from "drizzle-orm";
import type { Split } from "../domain/capacity/allocation";
import { validateTeamDefault } from "../domain/capacity/teamDefaultRules";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";

// Standard allocation (sean, 15 Nov 2026): each project has one set of default work allocations.
// A new team adopts it as its first Active team default. Changing it never changes existing teams.
// System standard (sean, 15 Nov 2026): the Admin sets one in Reference data; a project uses it until it sets its own.
// Both live in the same table: the project's own is row 1, the system one is row 0 of the shared (Default) database.

const PROJECT_ROW = 1;
const SYSTEM_ROW = 0;

export interface StandardAllocation {
  overhead: number;
  contingency: number;
  split: Required<Split>;
}

export type StandardResult = { ok: true } | { ok: false; errors: string[] };
export type StandardRequest = { overhead: number | null; contingency?: number | null; split: Split };

async function readRow(db: Db, id: number): Promise<StandardAllocation | null> {
  const row = await db.query.standardAllocation.findFirst({ where: eq(t.standardAllocation.id, id) });
  if (!row) return null;
  return {
    overhead: row.overhead,
    contingency: row.contingency,
    split: { run: row.run, fix: row.fix, sustain: row.sustain, change: row.change, enabling: row.enabling },
  };
}

/** Same rules as an Active team default (BR-01, BR-02, BR-03). Blank contingency counts as 0%. */
async function saveRow(db: Db, actor: string, id: number, entityId: string, request: StandardRequest): Promise<StandardResult> {
  const errors = validateTeamDefault({ ...request, status: "Active", effectiveFrom: "standard" });
  if (errors.length) return { ok: false, errors };
  const values = {
    overhead: request.overhead!,
    contingency: request.contingency ?? 0,
    ...request.split,
    enabling: request.split.enabling ?? 0,
  };
  await db.transaction(async (tx) => {
    const before = await tx.query.standardAllocation.findFirst({ where: eq(t.standardAllocation.id, id) });
    if (before) await tx.update(t.standardAllocation).set(values).where(eq(t.standardAllocation.id, id));
    else await tx.insert(t.standardAllocation).values({ id, ...values });
    await tx.insert(t.auditLog).values({
      actor, entity: "standard_allocation", entityId, action: before ? "update" : "add", before: before ?? null, after: values,
    });
  });
  return { ok: true };
}

/** The project's own standard allocation, if it has set one. */
export const getStandardAllocation = (db: Db) => readRow(db, PROJECT_ROW);

export const saveStandardAllocation = (db: Db, actor: string, request: StandardRequest) =>
  saveRow(db, actor, PROJECT_ROW, String(PROJECT_ROW), request);

/** The system standard allocation, kept in the shared (Default) database. */
export const getSystemStandard = (shared: Db) => readRow(shared, SYSTEM_ROW);

export const saveSystemStandard = (shared: Db, actor: string, request: StandardRequest) =>
  saveRow(shared, actor, SYSTEM_ROW, "system", request);

/** Drop the project's own standard, so it goes back to using the system one. */
export async function useSystemStandard(db: Db, actor: string): Promise<StandardResult> {
  await db.transaction(async (tx) => {
    const before = await tx.query.standardAllocation.findFirst({ where: eq(t.standardAllocation.id, PROJECT_ROW) });
    if (!before) return;
    await tx.delete(t.standardAllocation).where(eq(t.standardAllocation.id, PROJECT_ROW));
    await tx.insert(t.auditLog).values({
      actor, entity: "standard_allocation", entityId: String(PROJECT_ROW), action: "use system standard", before, after: null,
    });
  });
  return { ok: true };
}

/** What a new team starts with: the project's own standard, else the system one, else nothing (Draft, BR-17). */
export async function resolveStandard(
  db: Db, shared: Db,
): Promise<{ standard: StandardAllocation; source: "Project" | "System" } | null> {
  const own = await getStandardAllocation(db);
  if (own) return { standard: own, source: "Project" };
  const system = await getSystemStandard(shared);
  return system ? { standard: system, source: "System" } : null;
}
