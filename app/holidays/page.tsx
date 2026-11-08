import { listHolidayCalendars } from "../../src/application/loadHolidayCalendar";
import { getDb, today } from "../../src/infrastructure/db/appDb";
import { loadCalendarAction } from "./actions";

export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function LoadButton({ country, year, label }: { country: string; year: number; label: string }) {
  return (
    <form action={loadCalendarAction}>
      <input type="hidden" name="country" value={country} />
      <input type="hidden" name="year" value={year} />
      <button className="secondary" type="submit">{label}</button>
    </form>
  );
}

/** FR-20 / BR-10: which holiday calendars are loaded, which are missing, and a button to load each. */
export default async function HolidaysPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { loaded, missing } = await listHolidayCalendars(await getDb(), today());

  return (
    <>
      <h1>Public holidays</h1>
      <p className="muted">
        Holidays for Germany, France, Austria and Belgium come from the OpenHolidays API.
        A person whose country has no calendar for the year is shown as Provisional.
      </p>

      {params.loaded && (
        <p role="status" className="notice">Loaded {params.count} public holidays for {params.loaded}.</p>
      )}
      {params.error && (
        <div role="alert" aria-label="Problems loading" className="errors"><p>{params.error}</p></div>
      )}

      <table>
        <caption>Missing calendars</caption>
        <thead><tr><th>Calendar</th><th>Source</th><th></th></tr></thead>
        <tbody>
          {missing.length === 0 && <tr><td colSpan={3} className="empty">Nothing missing for this year or next.</td></tr>}
          {missing.map((m) => (
            <tr key={`${m.country}-${m.year}`}>
              <td>{m.country} {m.year}</td>
              <td>{m.how}</td>
              <td>{m.how === "OpenHolidays" ? <LoadButton country={m.country} year={m.year} label="Load" /> : <span className="muted">Upload not built yet</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table>
        <caption>Loaded calendars</caption>
        <thead><tr><th>Calendar</th><th>Source</th><th>Holidays</th><th>Loaded</th><th></th></tr></thead>
        <tbody>
          {loaded.length === 0 && <tr><td colSpan={5} className="empty">No calendars loaded yet.</td></tr>}
          {loaded.map((c) => (
            <tr key={`${c.country}-${c.year}`}>
              <td>{c.country} {c.year}</td>
              <td>{c.source}</td>
              <td>{c.holidays}</td>
              <td>{dateTime.format(c.loadedAt)}</td>
              <td><LoadButton country={c.country} year={c.year} label="Reload" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
