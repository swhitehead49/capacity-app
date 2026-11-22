import { asc, eq } from "drizzle-orm";
import { sameName } from "../domain/organisation/teamRules";
import * as t from "../infrastructure/db/schema";
import type { Db } from "../infrastructure/db/testDb";

// Reference data set once at system level, for every project (sean, 15 Nov 2026): the value streams and the
// locations that a team's Value stream and Base location (and a person's Location) are picked from.
// "shared" is the Default database, which holds the system's lists.

export type ReferenceResult = { ok: true } | { ok: false; errors: string[] };

export async function getReferenceData(shared: Db) {
  const valueStreams = (await shared.select().from(t.valueStreams).orderBy(asc(t.valueStreams.name))).map((v) => v.name);
  const locations = (await shared.select().from(t.locations).orderBy(asc(t.locations.code)))
    .map(({ code, country, name, standardHours }) => ({ code, country, name, standardHours }));
  return { valueStreams, locations };
}

export async function addValueStream(shared: Db, actor: string, request: { name: string }): Promise<ReferenceResult> {
  const name = request.name.trim();
  if (!name) return { ok: false, errors: ["Value stream name is needed"] };
  const { valueStreams } = await getReferenceData(shared);
  if (valueStreams.some((v) => sameName(v, name))) return { ok: false, errors: [`"${name}" is already a value stream`] };
  await shared.transaction(async (tx) => {
    await tx.insert(t.valueStreams).values({ name });
    await tx.insert(t.auditLog).values({ actor, entity: "value_streams", entityId: name, action: "add", before: null, after: { name } });
  });
  return { ok: true };
}

/** A pasted list of value streams, one per line (sean, 22 Nov 2026). New names are added; ones already there are skipped. */
export async function addValueStreams(
  shared: Db, actor: string, request: { text: string },
): Promise<{ ok: true; added: string[]; skipped: string[] } | { ok: false; errors: string[] }> {
  const names = request.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!names.length) return { ok: false, errors: ["Paste at least one value stream name"] };
  const known = [...(await getReferenceData(shared)).valueStreams];
  const added: string[] = [];
  const skipped: string[] = [];
  for (const name of names) {
    if (known.some((v) => sameName(v, name))) {
      if (!added.some((v) => sameName(v, name))) skipped.push(name);
      continue;
    }
    known.push(name);
    added.push(name);
  }
  if (added.length) {
    await shared.transaction(async (tx) => {
      await tx.insert(t.valueStreams).values(added.map((name) => ({ name })));
      for (const name of added) {
        await tx.insert(t.auditLog).values({ actor, entity: "value_streams", entityId: name, action: "add", before: null, after: { name } });
      }
    });
  }
  return { ok: true, added, skipped };
}

export async function addLocation(
  shared: Db, actor: string, request: { code: string; country: string; name: string; standardHours: string },
): Promise<ReferenceResult> {
  const code = request.code.trim().toUpperCase();
  const country = request.country.trim().toUpperCase();
  const name = request.name.trim();
  const hours = readHours(request.standardHours);
  const errors: string[] = [];
  if (!/^[A-Z]{2}(-[A-Z0-9]{1,3})?$/.test(code)) errors.push("Code must be a country code with an optional region, such as DE or DE-BY");
  if (!/^[A-Z]{2}$/.test(country)) errors.push("Country must be a 2-letter country code, such as DE");
  errors.push(...locationProblems(name, hours));
  if (!errors.length && code.slice(0, 2) !== country) errors.push(`The code ${code} doesn't start with the country ${country}`);
  if (errors.length) return { ok: false, errors };
  if ((await getReferenceData(shared)).locations.some((l) => l.code === code)) return { ok: false, errors: [`${code} is already a location`] };

  const location = { code, country, name, standardHours: hours };
  await shared.transaction(async (tx) => {
    await tx.insert(t.locations).values(location);
    await tx.insert(t.auditLog).values({ actor, entity: "locations", entityId: code, action: "add", before: null, after: location });
  });
  return { ok: true };
}

/** Change a location's name and standard hours (sean, 15 Nov 2026). The code and country stay as they are. */
export async function updateLocation(
  shared: Db, actor: string, request: { code: string; name: string; standardHours: string },
): Promise<ReferenceResult> {
  const current = (await getReferenceData(shared)).locations.find((l) => l.code === request.code);
  if (!current) return { ok: false, errors: [`Unknown location ${request.code}`] };
  const name = request.name.trim();
  const standardHours = readHours(request.standardHours);
  const errors = locationProblems(name, standardHours);
  if (errors.length) return { ok: false, errors };
  if (name === current.name && standardHours === current.standardHours) return { ok: false, errors: ["Nothing has changed"] };
  await shared.transaction(async (tx) => {
    await tx.update(t.locations).set({ name, standardHours }).where(eq(t.locations.code, current.code));
    await tx.insert(t.auditLog).values({
      actor, entity: "locations", entityId: current.code, action: "change",
      before: { name: current.name, standardHours: current.standardHours }, after: { name, standardHours },
    });
  });
  return { ok: true };
}

const readHours = (raw: string) => (raw.trim() === "" ? null : Number(raw));

function locationProblems(name: string, hours: number | null): string[] {
  const errors: string[] = [];
  if (!name) errors.push("Name is needed");
  if (hours !== null && !(hours > 0)) errors.push("Standard hours must be a number above 0, or blank");
  return errors;
}

/** The locations of the original workbook's LocationProfiles sheet, as ISO region codes, plus the India office (sean, 15 Nov 2026). */
export const STARTING_LOCATIONS = [
  { code: "DE-BY", country: "DE", name: "Bavaria", standardHours: 40 },
  { code: "DE-NI", country: "DE", name: "Lower Saxony", standardHours: 40 },
  { code: "DE-RP", country: "DE", name: "Rhineland-Palatinate", standardHours: 40 },
  { code: "DE-SL", country: "DE", name: "Saarland", standardHours: 40 },
  { code: "AT-9", country: "AT", name: "Vienna", standardHours: null },
  { code: "AT-6", country: "AT", name: "Styria (Graz)", standardHours: null },
  { code: "FR-NAQ", country: "FR", name: "Nouvelle-Aquitaine (Bordeaux)", standardHours: null },
  { code: "BE-VOV", country: "BE", name: "East Flanders (Ghent)", standardHours: null },
  { code: "IN-KA", country: "IN", name: "Karnataka (Bangalore)", standardHours: 40 },
];

/** Adds whichever starting locations are missing; ones already there are left as they are. Returns how many it added. */
export async function addStartingLocations(shared: Db, actor: string): Promise<number> {
  const have = new Set((await getReferenceData(shared)).locations.map((l) => l.code));
  const missing = STARTING_LOCATIONS.filter((l) => !have.has(l.code));
  if (!missing.length) return 0;
  await shared.transaction(async (tx) => {
    await tx.insert(t.locations).values(missing);
    await tx.insert(t.auditLog).values({
      actor, entity: "locations", entityId: missing.map((l) => l.code).join(", "), action: "add starting locations", before: null, after: missing,
    });
  });
  return missing.length;
}

/** Copies the system's locations into a project's own table, so its teams and people can point at them. */
export async function syncLocations(project: Db, shared: Db): Promise<void> {
  if (project === shared) return;
  const { locations } = await getReferenceData(shared);
  for (const location of locations) {
    await project.insert(t.locations).values(location)
      .onConflictDoUpdate({ target: t.locations.code, set: { country: location.country, name: location.name, standardHours: location.standardHours } });
  }
}
