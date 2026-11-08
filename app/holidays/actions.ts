"use server";

import { redirect } from "next/navigation";
import { loadHolidayCalendar } from "../../src/application/loadHolidayCalendar";
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
  const params = result.ok
    ? new URLSearchParams({ loaded: `${country} ${year}`, count: String(result.count) })
    : new URLSearchParams({ error: result.errors.join(" ") });
  redirect(`/holidays?${params}`);
}
