import { describe, expect, it } from "vitest";
import { filterStylists, stylistCountLabel } from "./filter-stylists";
import { STYLISTS } from "../data/stylist/stylist";
import { SERVICES } from "../data/services/services";

const ALL = { style: "" as const, location: "" };

describe("filterStylists", () => {
  it("returns everyone when nothing is set", () => {
    expect(filterStylists(STYLISTS, ALL)).toHaveLength(STYLISTS.length);
  });

  // Counted from the data rather than pinned to a number, so adding a stylist
  // does not break the test that adding a stylist is supposed to be safe.
  it("returns exactly the stylists who price that service", () => {
    for (const { id: style } of SERVICES) {
      const expected = STYLISTS.filter(({ services }) => style in services);
      const results = filterStylists(STYLISTS, { style, location: "" });

      expect(results, `category ${style}`).toEqual(expected);
    }
  });

  it("excludes a stylist who does not offer the service", () => {
    // Amara does wigs, natural hair and treatments — no braids.
    const braiders = filterStylists(STYLISTS, {
      style: "braids",
      location: "",
    });
    expect(braiders.map(({ id }) => id)).not.toContain("amara");
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
