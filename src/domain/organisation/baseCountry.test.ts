import { describe, expect, it } from "vitest";
import { countriesOf, countryLocationsToAdd, memberLocationFor, readBaseCountry, readPersonCountry } from "./baseCountry";

// FR-18t (sean, 22 Nov 2026): a team's base location is a country code (DE, AT, IN). Location codes with a region
// (DE-BY, AT-9) belong to people, for their public holidays.

const locations = [
  { code: "AT-9", country: "AT" }, { code: "DE-BY", country: "DE" }, { code: "DE-NI", country: "DE" }, { code: "IN-KA", country: "IN" },
];

describe("readBaseCountry", () => {
  it("takes a country code that the locations use, in any case; blank is none", () => {
    expect(readBaseCountry("de", locations)).toEqual({ country: "DE" });
    expect(readBaseCountry(" ", locations)).toEqual({ country: null });
  });

  it("turns a region location code into its country, so older spreadsheets still import", () => {
    expect(readBaseCountry("DE-BY", locations)).toEqual({ country: "DE" });
  });

  it("refuses anything else", () => {
    expect(readBaseCountry("FR", locations)).toEqual({ error: "Unknown base location FR: use a country code such as AT, DE or IN" });
  });
});

describe("countriesOf", () => {
  it("lists the countries of the locations, A–Z, once each", () => {
    expect(countriesOf(locations)).toEqual(["AT", "DE", "IN"]);
  });
});

// FR-05e (sean, 26 Nov 2026): a person's public holidays come from their COUNTRY's calendar, not a region's. A person
// points at the country's own location row (code = country, such as DE), so only the country's nationwide holidays apply.
const withCountries = [...locations, { code: "DE", country: "DE" }, { code: "IN", country: "IN" }];

describe("memberLocationFor", () => {
  it("a new member starts in their team's country", () => {
    expect(memberLocationFor("DE", withCountries)).toBe("DE");
    expect(memberLocationFor("AT", withCountries)).toBeNull(); // AT has no country row yet
    expect(memberLocationFor(null, withCountries)).toBeNull();
  });
});

describe("readPersonCountry", () => {
  it("takes a country code (any case), turns a region code into its country, and refuses anything else", () => {
    expect(readPersonCountry(" de ", withCountries)).toEqual({ country: "DE" });
    expect(readPersonCountry("DE-BY", withCountries)).toEqual({ country: "DE" });
    expect(readPersonCountry("", withCountries)).toEqual({ country: null });
    expect(readPersonCountry(null, withCountries)).toEqual({ country: null });
    expect(readPersonCountry("AT-9", withCountries)).toEqual({ error: "Unknown country AT-9: use DE or IN" });
    expect(readPersonCountry("XX", withCountries)).toEqual({ error: "Unknown country XX: use DE or IN" });
  });
});

describe("countryLocationsToAdd", () => {
  it("adds a country row for each country that has only region rows, taking the first region's standard hours", () => {
    const regions = [
      { code: "AT-9", country: "AT", name: "Vienna", standardHours: null },
      { code: "DE-BY", country: "DE", name: "Bavaria", standardHours: 40 },
      { code: "DE-NI", country: "DE", name: "Lower Saxony", standardHours: 38 },
      { code: "IN", country: "IN", name: "India", standardHours: 45 },
    ];
    expect(countryLocationsToAdd(regions)).toEqual([
      { code: "AT", country: "AT", name: "Austria", standardHours: null },
      { code: "DE", country: "DE", name: "Germany", standardHours: 40 },
    ]);
  });
});
