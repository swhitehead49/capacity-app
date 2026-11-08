import { parseHolidayCsv } from "../domain/holidays/holidayCsv";
import type { Db } from "../infrastructure/db/testDb";
import type { LoadResult } from "./loadHolidayCalendar";
import { replaceHolidayCalendar } from "./replaceHolidayCalendar";

/** Decision Q4: upload a company holiday list (India) for one year. All lines must be valid, or nothing is saved. */
export async function uploadHolidayCsv(
  db: Db,
  actor: string,
  request: { country: string; year: number; csv: string },
): Promise<LoadResult> {
  const { country, year } = request;
  if (!/^[A-Z]{2}$/.test(country)) return { ok: false, errors: ["Country must be a two-letter code such as IN"] };
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return { ok: false, errors: ["Year must be between 2020 and 2100"] };

  const { holidays, errors } = parseHolidayCsv(request.csv, { country, year });
  if (errors.length) return { ok: false, errors };

  await replaceHolidayCalendar(db, actor, { country, year, source: "CSV upload", action: "upload", holidays });
  return { ok: true, count: holidays.length };
}
