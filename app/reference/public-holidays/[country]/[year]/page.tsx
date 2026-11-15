import Link from "next/link";
import { getHolidayCalendar } from "@/src/application/getHolidayCalendar";
import { sharedDb } from "@/app/lib/project";
import { formatDate } from "@/app/lib/format";
import { putBackHolidayAction, removeHolidayAction } from "./actions";
import { AddHolidayForm } from "./AddHolidayForm";

export const dynamic = "force-dynamic";

/** FR-20 / UC10: the holidays in one loaded calendar, optionally for one region. */
export default async function HolidayCalendar({ params, searchParams }: {
  params: Promise<{ country: string; year: string }>;
  searchParams: Promise<{ region?: string }>;
}) {
  const { country, year } = await params;
  const { region } = await searchParams;
  const view = await getHolidayCalendar(await sharedDb(), { country, year: Number(year), region: region || undefined });

  return (
    <>
      <p className="muted"><Link href="/reference/public-holidays">← Public holidays</Link></p>
      <h1>{country} {year} public holidays</h1>
      {view.calendar ? (
        <p className="muted">
          From {view.calendar.source} · {view.holidays.length} shown, {view.weekdayCount} on weekdays
          (only weekdays reduce capacity){region ? ` · region ${region}` : ""}
        </p>
      ) : (
        <p>This calendar isn&apos;t loaded yet. Load it on the <Link href="/reference/public-holidays">Public holidays</Link> page.</p>
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
        <thead><tr><th>Date</th><th>Day</th><th>Holiday</th><th>Applies in</th><th>Source</th><th></th></tr></thead>
        <tbody>
          {view.holidays.length === 0 && <tr><td colSpan={6} className="empty">No holidays to show.</td></tr>}
          {view.holidays.map((h) => (
            <tr key={`${h.date}-${h.name}`} className={h.isWeekday ? "" : "muted"}>
              <td>{formatDate(h.date)}</td>
              <td>{h.weekday}{h.isWeekday ? "" : " (weekend)"}</td>
              <td>{h.name}</td>
              <td className="left">{h.regions.length === 0 ? "Whole country" : h.regions.join(", ")}</td>
              <td>{h.origin === "Added" ? "Added by hand" : view.calendar?.source}</td>
              <td>
                <form action={removeHolidayAction}>
                  <HiddenFields country={country} year={year} id={h.id} />
                  <button type="submit" className="secondary">Remove</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {view.removed.length > 0 && (
        <table className="members">
          <caption>Removed holidays</caption>
          <thead><tr><th>Date</th><th>Holiday</th><th>Applied in</th><th></th></tr></thead>
          <tbody>
            {view.removed.map((h) => (
              <tr key={h.id}>
                <td>{formatDate(h.date)}</td>
                <td>{h.name}</td>
                <td className="left">{h.regions.length === 0 ? "Whole country" : h.regions.join(", ")}</td>
                <td>
                  <form action={putBackHolidayAction}>
                    <HiddenFields country={country} year={year} id={h.id} />
                    <button type="submit" className="secondary">Put back</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view.calendar && (
        <>
          <h2>Add a holiday</h2>
          <p className="muted">Holidays you add or remove here are kept when the calendar is reloaded, and apply to every project.</p>
          <AddHolidayForm country={country} year={year} regions={view.regions} />
        </>
      )}
    </>
  );
}

function HiddenFields({ country, year, id }: { country: string; year: string; id: number }) {
  return (
    <>
      <input type="hidden" name="country" value={country} />
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="id" value={id} />
    </>
  );
}

