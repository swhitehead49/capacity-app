import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { OpenHolidaysEntry } from "../../domain/holidays/openHolidays";

const BASE_URL = "https://openholidaysapi.org/PublicHolidays";

export interface FetchOptions {
  /** Swap in a fake for tests. Defaults to the real fetch. */
  fetchFn?: (url: string) => Promise<Response>;
  /** Read saved answers ("DE-2026.json") from this folder instead of the internet. */
  fixtureDir?: string;
}

/** Get one country's public holidays for one calendar year from OpenHolidays (FR-20). */
export async function fetchOpenHolidays(country: string, year: number, options: FetchOptions = {}): Promise<OpenHolidaysEntry[]> {
  if (options.fixtureDir) return readSaved(options.fixtureDir, country, year);

  const url = `${BASE_URL}?countryIsoCode=${country}&languageIsoCode=EN&validFrom=${year}-01-01&validTo=${year}-12-31`;
  const response = await (options.fetchFn ?? fetch)(url);
  if (!response.ok) throw new Error(`OpenHolidays API answered ${response.status} for ${country} ${year}`);
  return (await response.json()) as OpenHolidaysEntry[];
}

function readSaved(dir: string, country: string, year: number): OpenHolidaysEntry[] {
  const file = join(dir, `${country}-${year}.json`);
  if (!existsSync(file)) throw new Error(`No saved OpenHolidays answer for ${country} ${year}`);
  return JSON.parse(readFileSync(file, "utf8")) as OpenHolidaysEntry[];
}
