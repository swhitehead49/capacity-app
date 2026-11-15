import { getSprintCalendar } from "@/src/application/sprintCalendar";
import { today } from "@/src/infrastructure/db/appDb";
import { sharedDb } from "@/app/lib/project";
import { formatDate } from "@/app/lib/format";
import { ExtendSprintCalendarForm, SetUpSprintCalendarForm } from "./SetUpForm";

export const dynamic = "force-dynamic";

/** Reference data, Sprint calendar tab (sean, 15 Nov 2026): the one sprint calendar every project uses. */
export default async function SprintCalendar({ searchParams }: { searchParams: Promise<{ extended?: string }> }) {
  const { extended } = await searchParams;
  const view = await getSprintCalendar(await sharedDb(), today());
  if (!view.settings) {
    return (
      <>
        <h2>Sprint calendar</h2>
        <p className="muted">Not set up yet. Every project will use this calendar. Sprints are numbered from the first one (S001, S002…),
          and quarters follow the calendar year.</p>
        <SetUpSprintCalendarForm />
      </>
    );
  }
  const { firstSprintStart, sprintLengthDays, sprintPrefix } = view.settings;
  return (
    <>
      <h2>Sprint calendar</h2>
      <p>First sprint starts {formatDate(firstSprintStart)} · {sprintLengthDays}-day sprints · named {sprintPrefix}001, {sprintPrefix}002…</p>
      <p className="muted">Every project uses this calendar. Sprints and quarters are created automatically up to the end of next quarter.
        The calendar can&apos;t be changed once sprints exist, because plans and overrides are attached to them.</p>

      <h3>Extend the calendar</h3>
      <p className="muted">
        {view.extendedTo ? `Extended to the end of ${view.extendedTo}. ` : ""}
        Create sprints and quarters further ahead than the automatic range. Sprint numbers don&apos;t change, and every project gets the
        new sprints and quarters the next time a team planner is opened. An extension can only move later.
      </p>
      {extended && <p role="status" className="notice">Saved. The calendar now runs to the end of {extended}.</p>}
      <ExtendSprintCalendarForm choices={laterQuarters(view.quarters.at(-1)?.id ?? null, today())} />

      <table className="members narrow">
        <caption>Sprints</caption>
        <thead><tr><th>Sprint</th><th>Starts</th><th>Ends</th><th>Quarter</th><th></th></tr></thead>
        <tbody>
          {view.sprints.map((s) => (
            <tr key={s.id} className={s.current ? "current" : ""}>
              <td>{s.id}</td><td>{formatDate(s.start)}</td><td>{formatDate(s.end)}</td><td>{s.parentId}</td><td>{s.current ? "Current" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="members narrow">
        <caption>Quarters</caption>
        <thead><tr><th>Quarter</th><th>Starts</th><th>Ends</th><th></th></tr></thead>
        <tbody>
          {view.quarters.map((q) => (
            <tr key={q.id}><td>{q.id}</td><td>{formatDate(q.start)}</td><td>{formatDate(q.end)}</td><td>{q.current ? "Current" : ""}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** The quarters after `last`, up to the end of the tenth calendar year from today, e.g. ["2028-Q1", …, "2036-Q4"]. */
function laterQuarters(last: string | null, todayDate: string): string[] {
  const lastYear = Number(todayDate.slice(0, 4)) + 10;
  const choices: string[] = [];
  for (let year = Number(todayDate.slice(0, 4)); year <= lastYear; year++) {
    for (let q = 1; q <= 4; q++) {
      const id = `${year}-Q${q}`;
      if (!last || id > last) choices.push(id);
    }
  }
  return choices;
}
