import { ensurePeriods } from "@/src/application/ensurePeriods";
import { getCapacitySummary, type SummaryRow, type SummaryScope } from "@/src/application/capacitySummary";
import { listProjectTeams } from "@/src/application/projectValueStreams";
import { getDb, today } from "@/src/infrastructure/db/appDb";
import { projectDb } from "@/app/lib/project";
import { formatDate } from "@/app/lib/format";

export const dynamic = "force-dynamic";

type Search = { show?: string; valueStream?: string; team?: string };

/**
 * FR-19c Capacity Summary (sean, 24 Nov 2026): for each sprint and quarter of the sprint calendar, the capacity of
 * all the project's teams together, one value stream, or one team, broken down by category (person-days).
 */
export default async function CapacitySummary({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<Search> }) {
  const { projectId } = await params;
  const search = await searchParams;
  const db = (await projectDb(projectId)).db;
  const shared = await getDb();
  await ensurePeriods(db, today(), shared);

  const teams = (await listProjectTeams(db, today())).filter((x) => !x.status.startsWith("Retired"));
  const valueStreams = [...new Set(teams.flatMap((x) => (x.valueStream ? [x.valueStream] : [])))].sort();
  const show = search.show === "valueStream" || search.show === "team" ? search.show : "all";
  const scope: SummaryScope =
    show === "valueStream" ? { kind: "valueStream", name: search.valueStream || valueStreams[0] || "" }
    : show === "team" ? { kind: "team", teamId: search.team || teams[0]?.id || "" }
    : { kind: "all" };
  const summary = await getCapacitySummary(db, { today: today(), scope }, shared);
  const title = scope.kind === "all" ? "All teams"
    : scope.kind === "valueStream" ? `Value stream: ${scope.name}`
    : `Team: ${teams.find((x) => x.id === scope.teamId)?.name ?? scope.teamId}`;

  return (
    <>
      <h2>Capacity summary</h2>
      <p className="muted">Person-days, as of {formatDate(today())}, from each team&apos;s plan. The categories add up to the
        available days; a team without an allocation counts as Not allocated. Functional total = Sustain + Change;
        Non-functional total = Fix + Run + Overhead.</p>

      <form method="get" className="filters summary-picker" aria-label="Show capacity for">
        <label>Show
          <select name="show" defaultValue={show}>
            <option value="all">All teams (total)</option>
            <option value="valueStream">One value stream</option>
            <option value="team">One team</option>
          </select>
        </label>
        <label>Value stream
          <select name="valueStream" defaultValue={scope.kind === "valueStream" ? scope.name : ""}>
            {valueStreams.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label>Team
          <select name="team" defaultValue={scope.kind === "team" ? scope.teamId : ""}>
            {teams.map((x) => <option key={x.id} value={x.id}>{x.id} | {x.name}</option>)}
          </select>
        </label>
        <button type="submit">Show</button>
      </form>

      <h3>{title} <span className="muted">· {summary.teams.length} team{summary.teams.length === 1 ? "" : "s"}</span></h3>
      <SummaryTable caption="Sprints" rows={summary.sprints} />
      <SummaryTable caption="Quarters" rows={summary.quarters} />
    </>
  );
}

function SummaryTable({ caption, rows }: { caption: string; rows: SummaryRow[] }) {
  return (
    <table className="summary">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th>Period</th><th>Dates</th><th>Teams</th><th>People</th><th>FTE</th><th>Available</th>
          <th>Overhead</th><th>Contingency</th><th>Run</th><th>Fix</th><th>Sustain</th><th>Change</th>
          <th>Enabling/<wbr />Training</th><th>Not allocated</th>
          <th className="total">Functional total</th><th className="total">Non-functional total</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={16} className="empty">No teams to show.</td></tr>}
        {rows.map((r) => (
          <tr key={r.periodId}>
            <td>{r.periodId}</td>
            <td>{formatDate(r.start)} – {formatDate(r.end)}</td>
            <td>{r.teams}</td><td>{r.headcount}</td><td>{r.allocatedFte.toFixed(2)}</td>
            <td><strong>{r.available.toFixed(1)}</strong></td>
            {[r.overhead, r.contingency, r.run, r.fix, r.sustain, r.change, r.enabling, r.notAllocated].map((v, i) => <td key={i}>{v.toFixed(1)}</td>)}
            <td className="total">{r.functional.toFixed(1)}</td><td className="total">{r.nonFunctional.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
