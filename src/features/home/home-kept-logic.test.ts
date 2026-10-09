import { describe, expect, it } from "vitest";
import {
  getAverageRating,
  getReviewCards,
  getReviewCountLabel,
} from "./home-reviews";
import { getHomeSearchHref } from "./home-search-link";

describe("Home logic kept from the prototype (not on the current page)", () => {
  it("builds the quick-search link", () => {
    expect(getHomeSearchHref({ service: "", date: "", loc: "" })).toBe(
      "/search",
    );
    expect(
      getHomeSearchHref({
        service: "braids",
        date: "2026-10-12",
        loc: "Chorlton",
      }),
    ).toBe("/search?group=braids&date=2026-10-12&loc=Chorlton");
  });

  it("aggregates review stats across stylists", () => {
    expect(getAverageRating()).toBe("4.8");
    expect(getReviewCountLabel()).toBe("1,090");
    expect(getReviewCards()[3]?.stars.map(({ fill }) => fill)).toEqual([
      "var(--brand-yellow)",
      "var(--brand-yellow)",
      "var(--brand-yellow)",
      "var(--brand-yellow)",
      "var(--neutral-300)",
    ]);
  });
});
