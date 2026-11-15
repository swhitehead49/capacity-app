import { eq } from "drizzle-orm";
import type { Split } from "../domain/capacity/allocation";
import { validateTeamDefault } from "../domain/capacity/teamDefaultRules";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";

// Standard allocation (sean, 15 Nov 2026): each project has one set of default work allocations.
// A new team adopts it as its first Active team default. Changing it never changes existing teams.

export interface StandardAllocation {
  overhead: number;
  contingency: number;
  split: Required<Split>;
}

export type StandardResult = { ok: true } | { ok: false; errors: string[] };

export async function getStandardAllocation(db: Db): Promise<StandardAllocation | null> {
  const row = await db.query.standardAllocation.findFirst();
  if (!row) return null;
  return {
    overhead: row.overhead,
    contingency: row.contingency,
    split: { run: row.run, fix: row.fix, sustain: row.sustain, change: row.change, enabling: row.enabling },
  };
}

/** Same rules as an Active team default (BR-01, BR-02, BR-03). Blank contingency counts as 0%. */
export async function saveStandardAllocation(
  db: Db, actor: string, request: { overhead: number | null; contingency?: number | null; split: Split },
): Promise<StandardResult> {
  const errors = validateTeamDefault({ ...request, status: "Active", effectiveFrom: "standard" });
  if (errors.length) return { ok: false, errors };
  const values = {
    overhead: request.overhead!,
    contingency: request.contingency ?? 0,
    ...request.split,
    enabling: request.split.enabling ?? 0,
  };
  await db.transaction(async (tx) => {
    const before = await tx.query.standardAllocation.findFirst();
    if (before) await tx.update(t.standardAllocation).set(values).where(eq(t.standardAllocation.id, 1));
    else await tx.insert(t.standardAllocation).values({ id: 1, ...values });
    await tx.insert(t.auditLog).values({
      actor, entity: "standard_allocation", entityId: "1", action: before ? "update" : "add", before: before ?? null, after: values,
    });
  });
  return { ok: true };
}
