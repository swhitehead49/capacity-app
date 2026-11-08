import * as t from "./schema";
import type { Db } from "./testDb";

/** Test data: the DRGW pilot team (anonymised), sprint S001 and its quarter, as in the workbook. */
export async function seedDrgw(db: Db) {
  await db.insert(t.teams).values({ id: "T017", name: "DRGW" });
  await db.insert(t.locations).values(
    ["DE-BY", "DE-NI", "DE-RP", "DE-SL"].map((code) => ({ code, country: "DE", name: code, standardHours: 40 })),
  );
  const people: [string, string, number | null, number][] = [
    ["a@example.com", "DE-BY", 40, 1],
    ["b@example.com", "DE-NI", 36, 0.9],
    ["c@example.com", "DE-RP", 40, 1],
    ["d@example.com", "DE-RP", 30, 1],
    ["e@example.com", "DE-RP", 40, 1],
    ["f@example.com", "DE-RP", null, 1], // incomplete: no contracted hours
    ["g@example.com", "DE-RP", 40, 1],
    ["h@example.com", "DE-RP", 40, 1],
    ["i@example.com", "DE-SL", 40, 0.5],
    ["j@example.com", "DE-RP", 40, 1],
  ];
  await db.insert(t.people).values(people.map(([email, locationCode, contractedHours]) => ({ email, locationCode, contractedHours })));
  await db.insert(t.assignments).values(people.map(([email, , , teamAllocation]) => ({ personEmail: email, teamId: "T017", teamAllocation })));
  await db.insert(t.planningPeriods).values([
    { id: "2026-Q4", type: "Quarter", startDate: "2026-10-01", endDate: "2026-12-31" },
    { id: "S001", type: "Sprint", startDate: "2026-10-26", endDate: "2026-11-08", parentPeriodId: "2026-Q4" },
  ]);
  await db.insert(t.publicHolidays).values([
    { date: "2026-10-31", country: "DE", regions: ["DE-NI"], name: "Reformation Day" },
    { date: "2026-11-01", country: "DE", regions: ["DE-BY", "DE-RP", "DE-SL"], name: "All Saints' Day" },
  ]);
  await db.insert(t.holidayCalendars).values({ country: "DE", year: 2026, source: "OpenHolidays API" });
  await db.insert(t.availabilityForecasts).values(
    ["DE-BY", "DE-NI", "DE-RP", "DE-SL"].map((locationCode) => ({ locationCode, month: "2026-11", availability: 0.9 })),
  );
  await db.insert(t.allocationSettings).values({
    teamId: "T017", level: "Team default", effectiveFrom: "2026-01-01", status: "Active",
    overhead: 0.2, run: 0.3, fix: 0.2, sustain: 0.2, change: 0.3,
  });
}
