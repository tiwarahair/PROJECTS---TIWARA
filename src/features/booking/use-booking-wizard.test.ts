import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBookingWizard } from "./use-booking-wizard";
import type { BookingSession } from "../../stores/overlays-slice";

const AUTO_ADVANCE_MS = 320;

function session(overrides: Partial<BookingSession> = {}): BookingSession {
  return {
    categoryKey: "braids",
    stylistName: "Tiwara's House",
    sessionId: 1,
    ...overrides,
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useBookingWizard", () => {
  it("starts on the style step with nothing chosen", () => {
    const { result } = renderHook(() => useBookingWizard(session()));

    expect(result.current.booking.step).toBe(0);
    expect(result.current.booking.styleId).toBeNull();
    expect(result.current.booking.colourId).toBe("1b");
    expect(result.current.booking.lengthIndex).toBe(1);
  });

  it("auto-advances to the customise step 320ms after a style is chosen", () => {
    const { result } = renderHook(() => useBookingWizard(session()));

    act(() => result.current.selectStyle("cornrows"));
    expect(result.current.booking.step).toBe(0);

    act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
    expect(result.current.booking.step).toBe(1);
    expect(result.current.booking.styleId).toBe("cornrows");
  });

  it("advances 320ms after the FIRST of two quick style clicks", () => {
    const { result } = renderHook(() => useBookingWizard(session()));

    act(() => result.current.selectStyle("cornrows"));
    act(() => void vi.advanceTimersByTime(100));
    act(() => result.current.selectStyle("fulani"));

    // 220ms more takes us to 320ms after the first click. An effect-with-
    // cleanup implementation would have cancelled that timer and waited until
    // 320ms after the second click instead.
    act(() => void vi.advanceTimersByTime(220));
    expect(result.current.booking.step).toBe(1);
    expect(result.current.booking.styleId).toBe("fulani");
  });

  it("picks the first style when continuing without choosing one", () => {
    const { result } = renderHook(() => useBookingWizard(session()));

    act(() => result.current.goNext());
    expect(result.current.booking.styleId).toBe("knotless");
    expect(result.current.booking.step).toBe(1);
  });

  describe("the review step's captured summary", () => {
    it("shows the static defaults on arrival, not the live selection", () => {
      const { result } = renderHook(() => useBookingWizard(session()));

      act(() => result.current.selectStyle("cornrows"));
      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      act(() => result.current.goNext()); // 1 -> 2
      act(() => result.current.goNext()); // 2 -> 3
      act(() => result.current.goNext()); // 3 -> 4

      expect(result.current.booking.step).toBe(4);
      // Cornrows is £60, but the summary is only captured when LEAVING step 4,
      // so the review still shows the hardcoded defaults. Preserved bug.
      expect(result.current.booking.review).toMatchObject({
        service: "—",
        colour: "1B Natural Black",
        length: 'Medium (14–18")',
        size: "Medium",
        money: { total: 130, deposit: 32.5, balance: 97.5 },
      });
    });

    it("captures the real selection only once step 4 is left", () => {
      const { result } = renderHook(() => useBookingWizard(session()));

      act(() => result.current.selectStyle("cornrows"));
      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      act(() => result.current.goNext());
      act(() => result.current.goNext());
      act(() => result.current.goNext());
      act(() => result.current.goNext()); // leaving 4 -> 5

      expect(result.current.booking.review).toMatchObject({
        service: "Cornrows",
        money: { total: 60, deposit: 15, balance: 45 },
      });
    });

    it("refreshes the money rows when an add-on is ticked, but nothing else", () => {
      const { result } = renderHook(() => useBookingWizard(session()));

      act(() => result.current.selectStyle("cornrows"));
      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      act(() => result.current.toggleAddOn("scalp"));

      // The checkbox called calcTotal() directly, so money updates...
      expect(result.current.booking.review.money).toEqual({
        total: 75,
        deposit: 18.75,
        balance: 56.25,
      });
      // ...while the rest of the summary stays stale.
      expect(result.current.booking.review.service).toBe("—");
    });
  });

  describe("reopening a booking", () => {
    it("resets category, step, style, colour and length", () => {
      const { result, rerender } = renderHook(
        ({ current }) => useBookingWizard(current),
        { initialProps: { current: session() } },
      );

      act(() => result.current.selectStyle("cornrows"));
      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      act(() => result.current.selectColour("613"));
      act(() => result.current.selectLength(3));

      rerender({
        current: session({ categoryKey: "locs", sessionId: 2 }),
      });

      expect(result.current.booking.categoryKey).toBe("locs");
      expect(result.current.booking.step).toBe(0);
      expect(result.current.booking.styleId).toBeNull();
      expect(result.current.booking.colourId).toBe("1b");
      expect(result.current.booking.lengthIndex).toBe(1);
    });

    it("keeps size, add-ons, date, time and details across bookings", () => {
      const { result, rerender } = renderHook(
        ({ current }) => useBookingWizard(current),
        { initialProps: { current: session() } },
      );

      act(() => result.current.selectSize("Large"));
      act(() => result.current.toggleAddOn("beads"));
      act(() => result.current.selectDay(14));
      act(() => result.current.selectTime("1330"));
      act(() => result.current.updateDetails({ firstName: "Amara" }));

      rerender({
        current: session({ categoryKey: "locs", sessionId: 2 }),
      });

      // The original's reset was partial and these survived. Preserved.
      expect(result.current.booking.size).toBe("Large");
      expect(result.current.booking.addOnIds).toEqual(["beads"]);
      expect(result.current.booking.dayNumber).toBe(14);
      expect(result.current.booking.timeSlotId).toBe("1330");
      expect(result.current.booking.details.firstName).toBe("Amara");
    });
  });

  it("clamps navigation at both ends", () => {
    const { result } = renderHook(() => useBookingWizard(session()));

    act(() => result.current.goPrev());
    expect(result.current.booking.step).toBe(0);

    for (let index = 0; index < 8; index += 1) {
      act(() => result.current.goNext());
    }
    expect(result.current.booking.step).toBe(5);
  });
});
