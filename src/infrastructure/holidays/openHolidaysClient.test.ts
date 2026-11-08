import { describe, expect, it } from "vitest";
import { fetchOpenHolidays } from "./openHolidaysClient";

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

describe("fetchOpenHolidays", () => {
  it("asks the API for one country's public holidays for the whole year, in English", async () => {
    let asked = "";
    await fetchOpenHolidays("AT", 2027, { fetchFn: async (url) => { asked = String(url); return ok([]); } });
    expect(asked).toBe(
      "https://openholidaysapi.org/PublicHolidays?countryIsoCode=AT&languageIsoCode=EN&validFrom=2027-01-01&validTo=2027-12-31",
    );
  });

  it("returns the entries the API sent", async () => {
    const entries = await fetchOpenHolidays("DE", 2026, { fetchFn: async () => ok([{ startDate: "2026-01-01" }]) });
    expect(entries).toEqual([{ startDate: "2026-01-01" }]);
  });

  it("gives a clear error when the API answers with an error", async () => {
    const fetchFn = async () => ({ ok: false, status: 503, json: async () => ({}) }) as Response;
    await expect(fetchOpenHolidays("DE", 2026, { fetchFn })).rejects.toThrow("OpenHolidays API answered 503 for DE 2026");
  });

  it("can read a saved answer from a folder instead (used by tests)", async () => {
    const entries = await fetchOpenHolidays("DE", 2026, { fixtureDir: "tests/fixtures/openholidays" });
    expect(entries).toHaveLength(20);
  });

  it("says which saved answer is missing", async () => {
    await expect(fetchOpenHolidays("FR", 2026, { fixtureDir: "tests/fixtures/openholidays" }))
      .rejects.toThrow("No saved OpenHolidays answer for FR 2026");
  });
});
