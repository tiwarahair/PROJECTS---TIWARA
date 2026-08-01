import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useScrolled } from "./use-scrolled";

function scrollTo(scrollY: number) {
  act(() => {
    window.scrollY = scrollY;
    window.dispatchEvent(new Event("scroll"));
  });
}

describe("useScrolled", () => {
  it("starts false even when the page loads already scrolled past the threshold", () => {
    window.scrollY = 500;
    const { result } = renderHook(() => useScrolled());
    // Matches the original, which only applied `.scrolled` on the first
    // scroll event rather than reading scrollY up front.
    expect(result.current).toBe(false);
    window.scrollY = 0;
  });

  it("flips just past the threshold, not at it", () => {
    const { result } = renderHook(() => useScrolled());

    scrollTo(60);
    expect(result.current).toBe(false);

    scrollTo(61);
    expect(result.current).toBe(true);
  });

  it("flips back when scrolled above the threshold again", () => {
    const { result } = renderHook(() => useScrolled());

    scrollTo(200);
    expect(result.current).toBe(true);

    scrollTo(0);
    expect(result.current).toBe(false);
  });
});
