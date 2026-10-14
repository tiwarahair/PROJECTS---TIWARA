import { beforeEach, describe, expect, it } from "vitest";
import { getShareData } from "../../hooks/use-share";
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
      ),
    ).toBe("Knotless braids · Chorlton · Sat 12 Sept, Morning");

    expect(getSearchSummary("/search?service=braids")).toBe(
      "Braids & Twists · Current location · Any time",
    );

    expect(getSearchSummary("/search?q=bob")).toBe(
      "‘bob’ · Current location · Any time",
    );

    expect(getSearchSummary("/search")).toBe(
      "All styles · Current location · Any time",
    );
  });

  it("falls back to Find a stylist without a stored search", () => {
    expect(getLastSearch()).toEqual({
      has: false,
      href: "/search",
      label: "Find a stylist",
      summary: "",
    });

    sessionStorage.setItem("tw_last_search", "/search?group=locs");

    expect(getLastSearch()).toMatchObject({
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
