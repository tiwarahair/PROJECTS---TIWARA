import { describe, expect, it } from "vitest";
import { filterStylists, stylistCountLabel } from "./filter-stylists";
import { STYLISTS } from "../data/stylists";

const ALL = { style: "" as const, location: "" };

describe("filterStylists", () => {
  it("returns everyone when nothing is set", () => {
    expect(filterStylists(STYLISTS, ALL)).toHaveLength(4);
  });

  it("counts per category as the original did", () => {
    const counts = {
      braids: 3,
      wigs: 3,
      locs: 2,
      "natural-hair": 3,
      treatments: 2,
    } as const;

    for (const [style, expected] of Object.entries(counts)) {
      const results = filterStylists(STYLISTS, {
        style: style as keyof typeof counts,
        location: "",
      });
      expect(results, `category ${style}`).toHaveLength(expected);
    }
  });

  it("matches city as a case-insensitive substring", () => {
    expect(
      filterStylists(STYLISTS, { style: "", location: "lon" }),
    ).toHaveLength(1);
    expect(
      filterStylists(STYLISTS, { style: "", location: "LON" }),
    ).toHaveLength(1);
    expect(
      filterStylists(STYLISTS, { style: "", location: "  london  " }),
    ).toHaveLength(1);
  });

  it("combines style and location", () => {
    expect(
      filterStylists(STYLISTS, { style: "locs", location: "birmingham" }),
    ).toHaveLength(1);
    expect(
      filterStylists(STYLISTS, { style: "wigs", location: "birmingham" }),
    ).toHaveLength(0);
  });

  it("returns nothing for an unknown city", () => {
    expect(filterStylists(STYLISTS, { style: "", location: "zzz" })).toEqual(
      [],
    );
  });
});

describe("stylistCountLabel", () => {
  it("singularises exactly one", () => {
    expect(stylistCountLabel(0)).toBe("0 stylists");
    expect(stylistCountLabel(1)).toBe("1 stylist");
    expect(stylistCountLabel(4)).toBe("4 stylists");
  });
});
