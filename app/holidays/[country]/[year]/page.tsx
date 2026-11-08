import Link from "next/link";
import { getHolidayCalendar } from "../../../../src/application/getHolidayCalendar";
import { getDb } from "../../../../src/infrastructure/db/appDb";
import { formatDate } from "../../../lib/format";

export const dynamic = "force-dynamic";

/** FR-20 / UC10: the holidays in one loaded calendar, optionally for one region. */
export default async function HolidayCalendar({ params, searchParams }: {
  params: Promise<{ country: string; year: string }>;
  searchParams: Promise<{ region?: string }>;
}) {
  const { country, year } = await params;
  const { region } = await searchParams;
  const view = await getHolidayCalendar(await getDb(), { country, year: Number(year), region: region || undefined });

  return (
    <>
      <p className="muted"><Link href="/holidays">← Public holidays</Link></p>
      <h1>{country} {year} public holidays</h1>
      {view.calendar ? (
        <p className="muted">
          From {view.calendar.source} · {view.holidays.length} shown, {view.weekdayCount} on weekdays
          (only weekdays reduce capacity){region ? ` · region ${region}` : ""}
        </p>
      ) : (
        <p>This calendar isn&apos;t loaded yet. Load it on the <Link href="/holidays">Holidays</Link> page.</p>
      )}

      <form className="picker" method="get">
        <label>Region
          <select name="region" defaultValue={region ?? ""}>
            <option value="">All regions</option>
            {view.regions.map((r) => <option key={r.code} value={r.code}>{r.name === r.code ? r.code : `${r.code} | ${r.name}`}</option>)}
          </select>
        </label>
        <button type="submit" className="secondary">Show</button>
      </form>

      <table className="members">
        <caption>Holidays</caption>
        <thead><tr><th>Date</th><th>Day</th><th>Holiday</th><th>Applies in</th></tr></thead>
        <tbody>
          {view.holidays.length === 0 && <tr><td colSpan={4} className="empty">No holidays to show.</td></tr>}
          {view.holidays.map((h) => (
            <tr key={`${h.date}-${h.name}`} className={h.isWeekday ? "" : "muted"}>
              <td>{formatDate(h.date)}</td>
              <td>{h.weekday}{h.isWeekday ? "" : " (weekend)"}</td>
              <td>{h.name}</td>
              <td className="left">{h.regions.length === 0 ? "Whole country" : h.regions.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
