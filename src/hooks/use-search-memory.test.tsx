import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LAST_SEARCH_KEY,
  SEARCH_BACK_KEY,
  SEARCH_SCROLL_KEY,
} from "../utils/last-search";
import { useSearchMemory } from "./use-search-memory";

describe("useSearchMemory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    window.history.replaceState(null, "", "/search?group=braids");
  });
  afterEach(() => vi.useRealTimers());

  it("remembers the search URL", () => {
    renderHook(() => useSearchMemory());
    expect(sessionStorage.getItem(LAST_SEARCH_KEY)).toBe(
      "/search?group=braids",
    );
  });

  it("Back to results restores the saved scroll instead of overwriting it", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    sessionStorage.setItem(SEARCH_BACK_KEY, "1");
    sessionStorage.setItem(
      SEARCH_SCROLL_KEY,
      JSON.stringify({ u: "?group=braids", y: 700 }),
    );
    renderHook(() => useSearchMemory());
    vi.advanceTimersByTime(60 * 41);
    expect(scrollTo).toHaveBeenCalledWith(0, 700);
    expect(sessionStorage.getItem(SEARCH_BACK_KEY)).toBeNull();
    scrollTo.mockRestore();
  });

  it("does not record another page as the search", () => {
    renderHook(() => useSearchMemory());
    window.history.replaceState(null, "", "/stylist?stylist=amara-beauty");
    vi.advanceTimersByTime(800);
    expect(sessionStorage.getItem(LAST_SEARCH_KEY)).toBe(
      "/search?group=braids",
    );
  });
});
