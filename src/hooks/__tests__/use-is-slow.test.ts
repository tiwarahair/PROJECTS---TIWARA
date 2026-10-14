import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIsSlow } from "../use-is-slow";

describe("useIsSlow", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("is false for quick waits and true once a wait passes the delay", () => {
    const { result, rerender } = renderHook(
      ({ isWaiting }) => useIsSlow(isWaiting, 300),
      { initialProps: { isWaiting: true } },
    );

    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe(true);

    rerender({ isWaiting: false });
    expect(result.current).toBe(false);

    rerender({ isWaiting: true });
    expect(result.current).toBe(false);
  });
});
