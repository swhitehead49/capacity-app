import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeamDefaults, type DefaultVersion } from "../../../../src/application/getTeamDefaults";
import { getDb, today } from "../../../../src/infrastructure/db/appDb";
import { formatDate, percent } from "../../../lib/format";
import { DefaultForm } from "./DefaultForm";

export const dynamic = "force-dynamic";

const summary = (d: DefaultVersion) =>
  `Overhead ${percent(d.overhead)}% · Contingency ${percent(d.contingency ?? 0)}% · Run ${percent(d.split.run)}% · Fix ${percent(d.split.fix)}% · ` +
  `Sustain ${percent(d.split.sustain)}% · Change ${percent(d.split.change)}%`;

/** UC03 / FR-10: the team's default allocation, its history, and a form for a new version. */
export default async function TeamDefault({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const data = await getTeamDefaults(await getDb(), { teamId, today: today() }).catch(() => null);
  if (!data) notFound();
  const { team, current, history } = data;
  const start = current ?? { overhead: null, contingency: null, split: { run: null, fix: null, sustain: null, change: null } };
  const values = {
    effectiveFrom: today(), status: "Active", reason: "",
    overhead: percent(start.overhead), contingency: percent(start.contingency ?? 0), run: percent(start.split.run), fix: percent(start.split.fix),
    sustain: percent(start.split.sustain), change: percent(start.split.change),
  };

  return (
    <>
      <p className="muted"><Link href={`/teams/${team.id}`}>← {team.name} planner</Link></p>
      <h1>{team.name} default</h1>
      <p className="muted">How the team&apos;s capacity is split when no quarter or sprint override applies. Overhead comes off first, then contingency is held back, and the rest is split across Run, Fix, Sustain and Change.</p>

      <section aria-label="In force today" className="reference">
        <h2>In force today <span className="muted">({formatDate(today())})</span></h2>
        {current
          ? <p>{summary(current)} <span className="muted">· since {formatDate(current.effectiveFrom)}</span></p>
          : <p>No default yet. The planner shows calendar capacity only until one is Active.</p>}
      </section>

      <h2>New default</h2>
      <p className="muted">
        Saving adds a new version from its effective date; earlier versions stay in the history.
        An Active default on the same date as another replaces it. A Draft can be incomplete and is never used.
      </p>
      <DefaultForm teamId={team.id} values={values} />

      <table>
        <caption>Default history</caption>
        <thead>
          <tr><th>Effective from</th><th>Status</th><th>Overhead</th><th>Contingency</th><th>Run</th><th>Fix</th><th>Sustain</th><th>Change</th><th>Reason</th></tr>
        </thead>
        <tbody>
          {history.length === 0 && <tr><td colSpan={9} className="empty">No versions yet.</td></tr>}
          {history.map((d) => (
            <tr key={d.id} className={d.status === "Retired" ? "muted" : ""}>
              <td>{d.effectiveFrom ? formatDate(d.effectiveFrom) : "(no date)"}</td>
              <td>{d.status}{current?.id === d.id ? " · in force" : ""}</td>
              <td>{percent(d.overhead)}%</td>
              <td>{percent(d.contingency ?? 0)}%</td>
              <td>{percent(d.split.run)}%</td>
              <td>{percent(d.split.fix)}%</td>
              <td>{percent(d.split.sustain)}%</td>
              <td>{percent(d.split.change)}%</td>
              <td className="left">{d.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
