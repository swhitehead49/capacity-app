import { notFound } from "next/navigation";
import { ensurePeriods } from "../../../src/application/ensurePeriods";
import { getTeamPlan, type PlanRow } from "../../../src/application/getTeamPlan";
import { getDb, today } from "../../../src/infrastructure/db/appDb";

export const dynamic = "force-dynamic";

/** UC01 Team Planner: sprints to the end of next quarter, quarters to the end of next year. */
export default async function TeamPlanner({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const db = await getDb();
  await ensurePeriods(db, today()); // UC11: create any missing periods first
  const plan = await getTeamPlan(db, { teamId, today: today() }).catch(() => null);
  if (!plan) notFound();

  return (
    <>
      <h1>{plan.team.name}</h1>
      <p className="muted">{plan.team.id} · person-days, as of {formatDate(today())} · <a href={`/teams/${plan.team.id}/members`}>Team members</a></p>
      <PlanTable caption="Sprints" rows={plan.sprints} teamId={plan.team.id} />
      <PlanTable caption="Quarters" rows={plan.quarters} teamId={plan.team.id} />
    </>
  );
}

function PlanTable({ caption, rows, teamId }: { caption: string; rows: PlanRow[]; teamId: string }) {
  return (
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th>Period</th><th>Dates</th><th>FTE</th><th>Available</th><th>Engineering</th>
          <th>Run</th><th>Fix</th><th>Sustain</th><th>Change</th><th>Allocation from</th><th>Status</th><th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.periodId}>
            <td>{row.periodId}</td>
            <td>{formatDate(row.start)} – {formatDate(row.end)}</td>
            <td>{days(row.allocatedFte, 2)}</td>
            <td>{days(row.calendarAvailableDays)}</td>
            <td>{days(row.engineeringDays)}</td>
            <td>{days(row.run)}</td>
            <td>{days(row.fix)}</td>
            <td>{days(row.sustain)}</td>
            <td>{days(row.change)}</td>
            <td>{row.splitSource ?? <span className="empty">None</span>}</td>
            <td className={`status-${row.status.replaceAll(" ", "-")}`}>{row.status}</td>
            <td><a className="edit" href={`/teams/${teamId}/periods/${row.periodId}/edit`}>Edit</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function days(value: number | null, decimals = 1) {
  return value === null ? <span className="empty">–</span> : value.toFixed(decimals);
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
