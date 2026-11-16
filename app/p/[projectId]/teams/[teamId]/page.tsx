import { notFound } from "next/navigation";
import { ensurePeriods } from "@/src/application/ensurePeriods";
import { getTeamPlan, type PlanRow } from "@/src/application/getTeamPlan";
import { getDb, today } from "@/src/infrastructure/db/appDb";
import { projectDb } from "@/app/lib/project";

export const dynamic = "force-dynamic";

/** UC01 Team Planner: sprints to the end of next quarter, quarters to the end of next year. */
export default async function TeamPlanner({ params }: { params: Promise<{ projectId: string; teamId: string }> }) {
  const { projectId, teamId } = await params;
  const db = (await projectDb(projectId)).db;
  await ensurePeriods(db, today(), await getDb()); // UC11: create any missing periods first, from the shared calendar
  const plan = await getTeamPlan(db, { teamId, today: today() }, await getDb()).catch(() => null);
  if (!plan) notFound();

  return (
    <>
      <h2>Capacity</h2>
      <p className="muted">Person-days, as of {formatDate(today())}. Use Edit on a sprint or quarter to change its allocation;
        every period starts from the <a href={`/p/${projectId}/teams/${plan.team.id}/default`}>Team default</a>.</p>
      <PlanTable caption="Sprints" rows={plan.sprints} projectId={projectId} teamId={plan.team.id} />
      <PlanTable caption="Quarters" rows={plan.quarters} projectId={projectId} teamId={plan.team.id} />
    </>
  );
}

function PlanTable({ caption, rows, projectId, teamId }: { caption: string; rows: PlanRow[]; projectId: string; teamId: string }) {
  return (
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th>Period</th><th>Dates</th><th>FTE</th><th>Available</th><th>Engineering</th><th>Contingency</th>
          <th>Run</th><th>Fix</th><th>Sustain</th><th>Change</th><th>Enabling/<wbr />Training</th><th>Allocation from</th><th>Status</th><th></th>
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
            <td>{days(row.contingencyDays)}</td>
            <td>{days(row.run)}</td>
            <td>{days(row.fix)}</td>
            <td>{days(row.sustain)}</td>
            <td>{days(row.change)}</td>
            <td>{days(row.enabling)}</td>
            <td>{row.splitSource ?? <span className="empty">None</span>}</td>
            <td className={`status-${row.status.replaceAll(" ", "-")}`}>{row.status}</td>
            <td><a className="edit" href={`/p/${projectId}/teams/${teamId}/periods/${row.periodId}/edit`}>Edit</a></td>
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
