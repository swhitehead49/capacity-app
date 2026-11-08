"use server";

import { redirect } from "next/navigation";
import { loadHolidayCalendar, type LoadResult } from "../../src/application/loadHolidayCalendar";
import { uploadHolidayCsv } from "../../src/application/uploadHolidayCsv";
import { getDb } from "../../src/infrastructure/db/appDb";
import { fetchOpenHolidays } from "../../src/infrastructure/holidays/openHolidaysClient";

// v1 has one actor (decision 8 Nov 2026).
const ACTOR = "Capacity Admin";

/** Load (or reload) one country/year from OpenHolidays, then show the result on the Holidays page. */
export async function loadCalendarAction(form: FormData) {
  const country = String(form.get("country"));
  const year = Number(form.get("year"));
  const fixtureDir = process.env.OPENHOLIDAYS_FIXTURE_DIR; // tests only: read saved answers
  const result = await loadHolidayCalendar(await getDb(), ACTOR, {
    country, year, fetchEntries: (c, y) => fetchOpenHolidays(c, y, { fixtureDir }),
  });
  showResult(result, `${country} ${year}`);
}

/** Decision Q4: upload a company holiday list (CSV) for one country and year. */
export async function uploadCsvAction(form: FormData) {
  const country = String(form.get("country") ?? "").trim().toUpperCase();
  const year = Number(form.get("year"));
  const file = form.get("file");
  const csv = file instanceof File ? await file.text() : "";
  const result = await uploadHolidayCsv(await getDb(), ACTOR, { country, year, csv });
  showResult(result, `${country} ${year}`);
}

const MAX_SHOWN = 20;

/** Back to the Holidays page with a success note or the list of problems. */
function showResult(result: LoadResult, calendar: string): never {
  if (result.ok) redirect(`/holidays?${new URLSearchParams({ loaded: calendar, count: String(result.count) })}`);
  const shown = result.errors.slice(0, MAX_SHOWN);
  if (result.errors.length > MAX_SHOWN) shown.push(`...and ${result.errors.length - MAX_SHOWN} more`);
  redirect(`/holidays?${new URLSearchParams({ error: shown.join("\n") })}`);
}
