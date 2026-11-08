import { listHolidayCalendars } from "../../src/application/loadHolidayCalendar";
import { getDb, today } from "../../src/infrastructure/db/appDb";
import { loadCalendarAction, uploadCsvAction } from "./actions";

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
  const nextUpload = missing.find((m) => m.how === "CSV upload");

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
        <div role="alert" aria-label="Problems loading" className="errors">
          {params.error.split("\n").map((line) => <p key={line}>{line}</p>)}
        </div>
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
              <td>{m.how === "OpenHolidays" ? <LoadButton country={m.country} year={m.year} label="Load" /> : <span className="muted">Upload below</span>}</td>
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
              <td>{c.country} {c.year} <a className="edit" href={`/holidays/${c.country}/${c.year}`}>View</a></td>
              <td>{c.source}</td>
              <td>{c.holidays}</td>
              <td>{dateTime.format(c.loadedAt)}</td>
              <td>{c.source === "CSV upload" ? <span className="muted">Upload again below</span> : <LoadButton country={c.country} year={c.year} label="Reload" />}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Upload a company holiday list</h2>
      <p className="muted">
        For countries OpenHolidays doesn&apos;t cover, such as India. Save the list from Excel as CSV with the headings
        {" "}<code>date,name</code>, plus an optional <code>regions</code> column (for example <code>IN-KA</code>; separate several
        with <code>;</code>, leave blank for the whole country). Dates can be 2027-01-26 or 26/01/2027.
        Uploading a year again replaces it.
      </p>
      <form action={uploadCsvAction} aria-label="Upload a holiday list" className="upload">
        <label>Country<input name="country" defaultValue={nextUpload?.country ?? "IN"} maxLength={2} required /></label>
        <label>Year<input name="year" type="number" defaultValue={nextUpload?.year ?? Number(today().slice(0, 4))} required /></label>
        <label>CSV file<input name="file" type="file" accept=".csv,text/csv" required /></label>
        <button type="submit">Upload</button>
      </form>
    </>
  );
}
