import { eq } from "drizzle-orm";
import { periodsNeeded, quarterEnd, quarterId } from "../domain/planning/periods";
import { toIsoDate } from "../domain/shared/csv";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";

// The sprint calendar, shared by all projects (sean, 15 Nov 2026), on Reference data's Sprint calendar tab.
// "shared" is the Default database. It can be set up once; sprints already created never change (decision 8 Nov 2026).

export type CalendarResult = { ok: true } | { ok: false; errors: string[] };

export async function getSprintCalendar(shared: Db, today: string) {
  const row = await shared.query.timelineSettings.findFirst();
  if (!row) return { settings: null, extendedTo: null, sprints: [], quarters: [], canChange: true };
  const settings = { firstSprintStart: row.firstSprintStart, sprintLengthDays: row.sprintLengthDays, sprintPrefix: row.sprintPrefix };
  const periods = periodsNeeded(today, { ...settings, extendTo: row.extendTo });
  const withCurrent = (p: (typeof periods)[number]) => ({ ...p, current: p.start <= today && today <= p.end });
  return {
    settings,
    extendedTo: row.extendTo ? quarterId(row.extendTo) : null,
    sprints: periods.filter((p) => p.type === "Sprint").map(withCurrent),
    quarters: periods.filter((p) => p.type === "Quarter").map(withCurrent),
    canChange: false,
  };
}

export async function setUpSprintCalendar(
  shared: Db, actor: string, request: { firstSprintStart: string; sprintLengthDays: string; sprintPrefix: string }, _today: string,
): Promise<CalendarResult> {
  const start = toIsoDate(request.firstSprintStart.trim());
  const length = Number(request.sprintLengthDays);
  const prefix = request.sprintPrefix.trim();
  const errors: string[] = [];
  if (!start) errors.push("First sprint start must be a real date");
  if (!(Number.isInteger(length) && length >= 1 && length <= 42)) errors.push("Sprint length must be a whole number of days from 1 to 42");
  if (!/^[A-Za-z]{1,5}$/.test(prefix)) errors.push("Sprint prefix must be 1 to 5 letters");
  if (errors.length || !start) return { ok: false, errors };
  if (await shared.query.timelineSettings.findFirst()) return { ok: false, errors: ["The sprint calendar is already set up"] };

  const settings = { id: 1, firstSprintStart: start, sprintLengthDays: length, sprintPrefix: prefix };
  await shared.transaction(async (tx) => {
    await tx.insert(t.timelineSettings).values(settings);
    await tx.insert(t.auditLog).values({ actor, entity: "timeline_settings", entityId: "1", action: "add", before: null, after: settings });
  });
  return { ok: true };
}

/**
 * Extend the calendar to the end of a later quarter, e.g. "2029-Q4" (sean, 15 Nov 2026).
 * Sprints keep their numbers; projects get the new sprints and quarters the next time a planner opens.
 * An extension can only move later, so periods that projects may already use never disappear.
 */
export async function extendSprintCalendar(shared: Db, actor: string, quarter: string, _today: string): Promise<CalendarResult> {
  const row = await shared.query.timelineSettings.findFirst();
  if (!row) return { ok: false, errors: ["Set up the sprint calendar first"] };
  const end = quarterEnd(quarter.trim());
  if (!end) return { ok: false, errors: ["Choose a quarter such as 2029-Q4"] };
  if (row.extendTo && end < row.extendTo) {
    return { ok: false, errors: [`The calendar already runs to ${quarterId(row.extendTo)}; it can only be extended further`] };
  }
  await shared.transaction(async (tx) => {
    await tx.update(t.timelineSettings).set({ extendTo: end }).where(eq(t.timelineSettings.id, 1));
    await tx.insert(t.auditLog).values({
      actor, entity: "timeline_settings", entityId: "1", action: "extend", before: { extendTo: row.extendTo }, after: { extendTo: end },
    });
  });
  return { ok: true };
}
