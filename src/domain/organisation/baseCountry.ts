// FR-18t (sean, 22 Nov 2026): a team's base location is a country code (DE, AT, IN). Location codes with a region
// (DE-BY, AT-9) belong to people, for their public holidays. Pure.

type Place = { code: string; country: string };

/** The countries of the system's locations, A–Z, once each: the choices for a team's base location. */
export function countriesOf(locations: Place[]): string[] {
  return [...new Set(locations.map((l) => l.country))].sort();
}

/** A base location as typed: a country code the locations use (any case), or a location code, which becomes its country. */
export function readBaseCountry(raw: string | null | undefined, locations: Place[]): { country: string | null } | { error: string } {
  const text = (raw ?? "").trim().toUpperCase();
  if (!text) return { country: null };
  const countries = countriesOf(locations);
  if (countries.includes(text)) return { country: text };
  const location = locations.find((l) => l.code.toUpperCase() === text);
  if (location) return { country: location.country };
  const examples = countries.length > 1 ? `${countries.slice(0, -1).join(", ")} or ${countries.at(-1)}` : countries[0] ?? "DE";
  return { error: `Unknown base location ${raw?.trim()}: use a country code such as ${examples}` };
}

// FR-05e (sean, 26 Nov 2026): a person has a COUNTRY, not a region. It points at the country's own location row
// (code = country, e.g. DE), so only that country's nationwide public holidays apply to them.

/** A new member's starting country: their team's country, when the system has that country. */
export function memberLocationFor(country: string | null, locations: Place[]): string | null {
  if (!country) return null;
  return locations.some((l) => l.code === country) ? country : null;
}

/** The countries a person can be in: the location rows that are a whole country (code = country), A–Z. */
export function personCountries(locations: Place[]): string[] {
  return locations.filter((l) => l.code === l.country).map((l) => l.code).sort();
}

/** A person's country as typed: a country code (any case), or a region code (DE-BY), which becomes its country. */
export function readPersonCountry(raw: string | null | undefined, locations: Place[]): { country: string | null } | { error: string } {
  const text = (raw ?? "").trim().toUpperCase();
  if (!text) return { country: null };
  const countries = personCountries(locations);
  const country = locations.find((l) => l.code.toUpperCase() === text)?.country ?? text;
  if (countries.includes(country)) return { country };
  const list = countries.length > 1 ? `${countries.slice(0, -1).join(", ")} or ${countries.at(-1)}` : countries[0] ?? "a country code";
  return { error: `Unknown country ${raw?.trim()}: use ${list}` };
}

type FullPlace = Place & { name: string; standardHours: number | null };

/** The whole-country rows that are missing: one per country that so far has only region rows (first region's hours). */
export function countryLocationsToAdd(locations: FullPlace[]): FullPlace[] {
  const have = new Set(personCountries(locations));
  const added = new Map<string, FullPlace>();
  for (const l of [...locations].sort((a, b) => a.code.localeCompare(b.code))) {
    if (have.has(l.country) || added.has(l.country)) continue;
    added.set(l.country, { code: l.country, country: l.country, name: countryName(l.country), standardHours: l.standardHours });
  }
  return [...added.values()];
}

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
