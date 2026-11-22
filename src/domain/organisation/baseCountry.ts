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

/** A new member's starting location: the only location in the team's country, or none (then it is picked). */
export function memberLocationFor(country: string | null, locations: Place[]): string | null {
  if (!country) return null;
  const inCountry = locations.filter((l) => l.country === country);
  return inCountry.length === 1 ? inCountry[0]!.code : null;
}
