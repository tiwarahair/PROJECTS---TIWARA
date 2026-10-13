import { describe, expect, it } from "vitest";
import { toPlaceAddress } from "../google-maps";

const part = (text: string, type: string) => ({ text, types: [type] });

describe("toPlaceAddress", () => {
  it("puts a numbered street first and the flat second", () => {
    expect(
      toPlaceAddress(
        [
          part("12", "street_number"),
          part("Dickenson Road", "route"),
          part("Flat 3", "subpremise"),
          part("Manchester", "postal_town"),
          part("M14 5TQ", "postal_code"),
          part("Rusholme", "sublocality_level_1"),
        ],
        { lat: 53.45, lng: -2.22 },
      ),
    ).toEqual({
      line1: "12 Dickenson Road",
      line2: "Flat 3",
      town: "Manchester",
      postcode: "M14 5TQ",
      area: "Rusholme, M14",
      location: { lat: 53.45, lng: -2.22 },
    });
  });

  it("puts a named building before an unnumbered street", () => {
    expect(
      toPlaceAddress(
        [
          part("Stopford Building", "premise"),
          part("Oxford Road", "route"),
          part("Manchester", "postal_town"),
          part("M13 9PL", "postal_code"),
        ],
        null,
      ),
    ).toMatchObject({
      line1: "Stopford Building",
      line2: "Oxford Road",
      area: "Manchester, M13",
    });
  });
});
