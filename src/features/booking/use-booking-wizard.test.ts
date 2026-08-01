import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBookingWizard } from "./use-booking-wizard";
import { BOOKING_STEP } from "../../types/booking";
import { defaultDateWindow } from "../../utils/dates";
import type { BookingSession } from "../../stores/overlays-slice";

const AUTO_ADVANCE_MS = 320;
const STYLIST_ADVANCE_MS = 300;

function session(overrides: Partial<BookingSession> = {}): BookingSession {
  return {
    categoryKey: "braids",
    stylistId: null,
    stylistName: "Tiwara's House",
    sessionId: 1,
    ...overrides,
  };
}

/** Walks from the style step to the customise step the way the UI does. */
function advanceToCustomise(result: {
  current: ReturnType<typeof useBookingWizard>;
}) {
  act(() => result.current.selectStyle("cornrows"));
  act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
  act(() => result.current.setDateRange("2026-08-10", "2026-08-20"));
  act(() => result.current.goNext());
  act(() => result.current.selectStylist("tiwara"));
  act(() => void vi.advanceTimersByTime(STYLIST_ADVANCE_MS));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useBookingWizard", () => {
  it("starts on the style step with nothing chosen", () => {
    const { result } = renderHook(() => useBookingWizard(session()));

    expect(result.current.booking.step).toBe(BOOKING_STEP.style);
    expect(result.current.booking.styleId).toBeNull();
    expect(result.current.booking.stylistId).toBeNull();
    // The date window is pre-filled with today → +30 days.
    expect(result.current.booking.dateFrom).toBe(defaultDateWindow().from);
    expect(result.current.booking.dateTo).toBe(defaultDateWindow().to);
    expect(result.current.booking.colourId).toBe("1b");
    expect(result.current.booking.lengthIndex).toBe(1);
  });

  describe("step order", () => {
    it("runs style → when&where → stylist → customise → schedule → details → review → confirm", () => {
      const { result } = renderHook(() => useBookingWizard(session()));

      act(() => result.current.selectStyle("cornrows"));
      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      expect(result.current.booking.step).toBe(BOOKING_STEP.whenWhere);

      act(() => result.current.goNext());
      expect(result.current.booking.step).toBe(BOOKING_STEP.stylist);

      act(() => result.current.selectStylist("tiwara"));
      act(() => void vi.advanceTimersByTime(STYLIST_ADVANCE_MS));
      expect(result.current.booking.step).toBe(BOOKING_STEP.customise);

      act(() => result.current.goNext());
      expect(result.current.booking.step).toBe(BOOKING_STEP.schedule);

      act(() => result.current.goNext());
      expect(result.current.booking.step).toBe(BOOKING_STEP.details);

      act(() => result.current.goNext());
      expect(result.current.booking.step).toBe(BOOKING_STEP.review);

      act(() => result.current.goNext());
      expect(result.current.booking.step).toBe(BOOKING_STEP.confirm);
    });

    it("clamps at both ends", () => {
      const { result } = renderHook(() => useBookingWizard(session()));

      act(() => result.current.goPrev());
      expect(result.current.booking.step).toBe(BOOKING_STEP.style);

      for (let index = 0; index < 12; index += 1) {
        act(() => result.current.goNext());
      }
      expect(result.current.booking.step).toBe(BOOKING_STEP.confirm);
    });
  });

  describe("auto-advance", () => {
    it("moves off the style step 320ms after a style is chosen", () => {
      const { result } = renderHook(() => useBookingWizard(session()));

      act(() => result.current.selectStyle("cornrows"));
      expect(result.current.booking.step).toBe(BOOKING_STEP.style);

      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      expect(result.current.booking.step).toBe(BOOKING_STEP.whenWhere);
      expect(result.current.booking.styleId).toBe("cornrows");
    });

    it("advances 320ms after the FIRST of two quick style clicks", () => {
      const { result } = renderHook(() => useBookingWizard(session()));

      act(() => result.current.selectStyle("cornrows"));
      act(() => void vi.advanceTimersByTime(100));
      act(() => result.current.selectStyle("fulani"));

      act(() => void vi.advanceTimersByTime(220));
      expect(result.current.booking.step).toBe(BOOKING_STEP.whenWhere);
      expect(result.current.booking.styleId).toBe("fulani");
    });

    it("moves off the stylist step 300ms after one is picked", () => {
      const { result } = renderHook(() => useBookingWizard(session()));

      act(() => result.current.selectStyle("cornrows"));
      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      act(() => result.current.goNext());

      act(() => result.current.selectStylist("nia"));
      expect(result.current.booking.step).toBe(BOOKING_STEP.stylist);

      act(() => void vi.advanceTimersByTime(STYLIST_ADVANCE_MS));
      expect(result.current.booking.step).toBe(BOOKING_STEP.customise);
      expect(result.current.booking.stylistId).toBe("nia");
    });

    it("picks the first style when continuing without choosing one", () => {
      const { result } = renderHook(() => useBookingWizard(session()));

      act(() => result.current.goNext());
      expect(result.current.booking.styleId).toBe("knotless");
      expect(result.current.booking.step).toBe(BOOKING_STEP.whenWhere);
    });
  });

  describe("booking opened from a stylist", () => {
    const fromStylist = () =>
      session({ stylistId: "nia", stylistName: "NaturallyNia" });

    it("skips when & where and the stylist picker", () => {
      const { result } = renderHook(() => useBookingWizard(fromStylist()));

      expect(result.current.sequence).toEqual([
        BOOKING_STEP.style,
        BOOKING_STEP.customise,
        BOOKING_STEP.schedule,
        BOOKING_STEP.details,
        BOOKING_STEP.review,
        BOOKING_STEP.confirm,
      ]);
    });

    it("goes straight from style to customise", () => {
      const { result } = renderHook(() => useBookingWizard(fromStylist()));

      act(() => result.current.selectStyle("cornrows"));
      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      expect(result.current.booking.step).toBe(BOOKING_STEP.customise);
    });

    it("steps back from customise to style, not into the skipped steps", () => {
      const { result } = renderHook(() => useBookingWizard(fromStylist()));

      act(() => result.current.selectStyle("cornrows"));
      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      act(() => result.current.goPrev());
      expect(result.current.booking.step).toBe(BOOKING_STEP.style);
    });

    it("carries the stylist through without asking again", () => {
      const { result } = renderHook(() => useBookingWizard(fromStylist()));
      expect(result.current.booking.stylistId).toBe("nia");
    });

    it("still reaches the confirmation step", () => {
      const { result } = renderHook(() => useBookingWizard(fromStylist()));

      for (let index = 0; index < 10; index += 1) {
        act(() => result.current.goNext());
      }
      expect(result.current.booking.step).toBe(BOOKING_STEP.confirm);
    });
  });

  describe("when & where", () => {
    it("records the date window and location", () => {
      const { result } = renderHook(() => useBookingWizard(session()));

      act(() => result.current.setDateRange("2026-08-10", "2026-08-20"));
      act(() => result.current.setLocation("London"));

      expect(result.current.booking.dateFrom).toBe("2026-08-10");
      expect(result.current.booking.dateTo).toBe("2026-08-20");
      expect(result.current.booking.location).toBe("London");
    });
  });

  describe("the review summary", () => {
    it("reflects the live selection as soon as the step is reached", () => {
      const { result } = renderHook(() => useBookingWizard(session()));
      advanceToCustomise(result);

      act(() => result.current.goNext()); // schedule
      act(() => result.current.goNext()); // details
      act(() => result.current.goNext()); // review

      expect(result.current.booking.step).toBe(BOOKING_STEP.review);
      // Cornrows is £60 — the summary is derived, not a stale snapshot.
      expect(result.current.review).toMatchObject({
        service: "Cornrows",
        colour: "1B Natural Black",
        size: "Medium",
        money: { total: 60, deposit: 15, balance: 45 },
      });
    });

    it("updates when an add-on is ticked", () => {
      const { result } = renderHook(() => useBookingWizard(session()));
      advanceToCustomise(result);

      act(() => result.current.toggleAddOn("boho"));
      expect(result.current.review.money).toEqual({
        total: 75,
        fee: 1.5,
        deposit: 18.75,
        balance: 56.25,
      });

      act(() => result.current.toggleAddOn("boho"));
      expect(result.current.review.money.total).toBe(60);
    });

    it("carries the 2% platform fee without adding it to the total", () => {
      const { result } = renderHook(() => useBookingWizard(session()));
      advanceToCustomise(result);

      const { total, fee, deposit, balance } = result.current.review.money;
      expect(total).toBe(60);
      expect(fee).toBe(1.2);
      // Deposit and balance still come from the total, not total + fee.
      expect(deposit).toBe(15);
      expect(balance).toBe(45);
    });
  });

  describe("reopening a booking", () => {
    it("clears everything the first three steps collect", () => {
      const { result, rerender } = renderHook(
        ({ current }) => useBookingWizard(current),
        { initialProps: { current: session() } },
      );

      advanceToCustomise(result);
      act(() => result.current.setLocation("London"));
      act(() => result.current.selectColour("613"));
      act(() => result.current.selectLength(3));

      rerender({ current: session({ categoryKey: "locs", sessionId: 2 }) });

      expect(result.current.booking.categoryKey).toBe("locs");
      expect(result.current.booking.step).toBe(BOOKING_STEP.style);
      expect(result.current.booking.styleId).toBeNull();
      expect(result.current.booking.stylistId).toBeNull();
      expect(result.current.booking.dateFrom).toBe(defaultDateWindow().from);
      expect(result.current.booking.location).toBe("");
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

      rerender({ current: session({ categoryKey: "locs", sessionId: 2 }) });

      expect(result.current.booking.size).toBe("Large");
      expect(result.current.booking.addOnIds).toEqual(["beads"]);
      expect(result.current.booking.dayNumber).toBe(14);
      expect(result.current.booking.timeSlotId).toBe("1330");
      expect(result.current.booking.details.firstName).toBe("Amara");
    });
  });
});
