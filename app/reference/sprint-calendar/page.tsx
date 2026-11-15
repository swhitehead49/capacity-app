import { getSprintCalendar } from "@/src/application/sprintCalendar";
import { today } from "@/src/infrastructure/db/appDb";
import { sharedDb } from "@/app/lib/project";
import { formatDate } from "@/app/lib/format";
import { SetUpSprintCalendarForm } from "./SetUpForm";

export const dynamic = "force-dynamic";

/** Reference data, Sprint calendar tab (sean, 15 Nov 2026): the one sprint calendar every project uses. */
export default async function SprintCalendar() {
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
