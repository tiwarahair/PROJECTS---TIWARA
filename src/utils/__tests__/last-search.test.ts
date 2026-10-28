import { beforeEach, describe, expect, it } from "vitest";
import { getShareData } from "../../hooks/use-share";
import { TEST_CATALOGUE } from "../../test/catalogue";
import { getLastSearch, getSearchSummary } from "../last-search";

describe("last search", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, "", "/amara-beauty");
  });

  it("summarises what, where and when", () => {
    expect(
      getSearchSummary(
        "/search?type=knotless-braids&loc=Chorlton&date=2026-09-12&time=morning",
        TEST_CATALOGUE,
      ),
    ).toBe("Knotless braids · Chorlton · Sat 12 Sept, Morning");

    expect(getSearchSummary("/search?service=braids", TEST_CATALOGUE)).toBe(
      "Braids & Twists · Current location · Any time",
    );

    expect(getSearchSummary("/search?q=bob", TEST_CATALOGUE)).toBe(
      "‘bob’ · Current location · Any time",
    );

    expect(getSearchSummary("/search", TEST_CATALOGUE)).toBe(
      "All styles · Current location · Any time",
    );
  });

  it("holds the summary back until the catalogue can name the style", () => {
    sessionStorage.setItem("tw_last_search", "/search?type=silk-press");

    expect(getLastSearch().summary).toBeNull();

    expect(getLastSearch(TEST_CATALOGUE).summary).toBe(
      "Silk press · Current location · Any time",
    );
  });

  it("falls back to Find a stylist without a stored search", () => {
    expect(getLastSearch(TEST_CATALOGUE)).toEqual({
      has: false,
      href: "/search",
      label: "Find a stylist",
      summary: "",
    });

    sessionStorage.setItem("tw_last_search", "/search?group=locs");

    expect(getLastSearch(TEST_CATALOGUE)).toMatchObject({
      has: true,
      href: "/search?group=locs",
      label: "Back to results",
    });
  });

  it("builds clean share links", () => {
    const { url, title, whatsapp } = getShareData({
      id: "amara-beauty",
      name: "Amara Beauty",
      area: "Hulme, Manchester",
    });

    expect(url).toBe(`${window.location.origin}/amara-beauty`);
    expect(title).toBe("Amara Beauty on Tiwára’s House");

    const shareText = encodeURIComponent(
      `Amara Beauty · Hulme, Manchester ${url}`,
    );

    expect(whatsapp).toBe(`https://wa.me/?text=${shareText}`);
  });
});
