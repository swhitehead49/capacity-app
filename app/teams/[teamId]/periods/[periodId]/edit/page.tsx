import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getOverride } from "../../../../../../src/application/saveOverride";
import { getDb } from "../../../../../../src/infrastructure/db/appDb";
import * as t from "../../../../../../src/infrastructure/db/schema";
import { OverrideForm } from "./OverrideForm";
import { RevertButtons } from "./RevertButtons";

export const dynamic = "force-dynamic";

/** UC04: edit the override for one sprint or quarter. */
export default async function EditOverride({ params }: { params: Promise<{ teamId: string; periodId: string }> }) {
  const { teamId, periodId } = await params;
  const db = await getDb();
  const team = await db.query.teams.findFirst({ where: eq(t.teams.id, teamId) });
  const view = team ? await getOverride(db, { teamId, periodId }).catch(() => null) : null;
  if (!team || !view) notFound();

  const applied = view.currentlyApplied;
  const split = view.override?.split ?? applied.split ?? { run: 0, fix: 0, sustain: 0, change: 0 };
  const pct = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(+(value * 100).toFixed(2)));

  return (
    <>
      <h1>{team.name} · {view.period.id}</h1>
      <p className="muted">{view.level} · {formatDate(view.period.start)} – {formatDate(view.period.end)}</p>
      <p>
        Currently applied: {applied.splitSource ?? "nothing (calendar capacity only)"}
        {applied.overhead !== null && <span className="muted"> · overhead {pct(applied.overhead)}% from {applied.overheadSource}</span>}
      </p>
      <section aria-label="Team default (read only)" className="reference">
        <h2>Team default <span className="muted">(read only)</span></h2>
        {view.teamDefault ? (
          <p>
            Overhead {pct(view.teamDefault.overhead)}% · Run {pct(view.teamDefault.split.run)}% ·
            Fix {pct(view.teamDefault.split.fix)}% · Sustain {pct(view.teamDefault.split.sustain)}% ·
            Change {pct(view.teamDefault.split.change)}%
            <span className="muted"> · since {formatDate(view.teamDefault.effectiveFrom ?? view.period.start)}</span>
          </p>
        ) : (
          <p className="muted">No Active team default yet.</p>
        )}
        <p><a className="edit" href={`/teams/${teamId}/default`}>Change the team default</a></p>
      </section>
      <OverrideForm
        values={{
          teamId,
          periodId,
          status: view.override?.status ?? "Active",
          overhead: pct(view.override?.overhead),
          run: pct(split.run),
          fix: pct(split.fix),
          sustain: pct(split.sustain),
          change: pct(split.change),
          reason: view.override?.reason ?? "",
        }}
      />
      <RevertButtons teamId={teamId} periodId={periodId} hasOverride={view.override !== null} />
    </>
  );
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
