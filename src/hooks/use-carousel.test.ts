import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCarousel } from "./use-carousel";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useCarousel", () => {
  it("advances on the interval and wraps around", () => {
    const { result } = renderHook(() => useCarousel(3));
    expect(result.current.index).toBe(0);

    act(() => void vi.advanceTimersByTime(5000));
    expect(result.current.index).toBe(1);

    act(() => void vi.advanceTimersByTime(10_000));
    expect(result.current.index).toBe(0);
  });

  it("goTo jumps straight to a slide", () => {
    const { result } = renderHook(() => useCarousel(3));

    act(() => result.current.goTo(2));
    expect(result.current.index).toBe(2);
  });

  it("goTo does not restart the timer", () => {
    const { result } = renderHook(() => useCarousel(3));

    // 4s in, jump to slide 2. The original's interval was created once and
    // never reset, so the next auto-advance still lands 1s later.
    act(() => void vi.advanceTimersByTime(4000));
    act(() => result.current.goTo(2));

    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.index).toBe(0);
  });
});
