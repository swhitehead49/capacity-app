import { describe, expect, it } from "vitest";
import { countriesOf, memberLocationFor, readBaseCountry } from "./baseCountry";

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

describe("memberLocationFor", () => {
  it("a new member starts in their team's country when it has only one location; otherwise they pick", () => {
    expect(memberLocationFor("AT", locations)).toBe("AT-9");
    expect(memberLocationFor("DE", locations)).toBeNull();
    expect(memberLocationFor(null, locations)).toBeNull();
  });
});
