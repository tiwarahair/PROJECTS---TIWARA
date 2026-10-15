import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentPosition } from "../use-current-position";

const mockLocation = (permission: PermissionState) => {
  vi.stubGlobal("navigator", {
    ...navigator,
    permissions: { query: vi.fn().mockResolvedValue({ state: permission }) },
    geolocation: { getCurrentPosition: vi.fn() },
  });
};

describe("useCurrentPosition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("waits briefly for the position when location is already allowed", async () => {
    mockLocation("granted");
    const { result } = renderHook(() => useCurrentPosition());

    await act(() => vi.advanceTimersByTimeAsync(100));

    expect(result.current.isWaiting).toBe(true);

    await act(() => vi.advanceTimersByTimeAsync(3000));

    expect(result.current.isWaiting).toBe(false);
  });

  it("doesn't wait while the browser is about to ask", async () => {
    mockLocation("prompt");
    const { result } = renderHook(() => useCurrentPosition());

    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(result.current).toMatchObject({
      status: "asking",
      isWaiting: false,
    });
  });

  it("starts from the position found earlier in this session", () => {
    mockLocation("granted");
    sessionStorage.setItem("search.position", '{"lat":53.48,"lng":-2.24}');

    const { result } = renderHook(() => useCurrentPosition());

    expect(result.current).toMatchObject({
      status: "found",
      isWaiting: false,
      position: { lat: 53.48, lng: -2.24 },
    });

    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });
});
