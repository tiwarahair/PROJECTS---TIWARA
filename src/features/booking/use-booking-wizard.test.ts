import { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBookingWizard } from "./use-booking-wizard";
import { BOOKING_STEP, type BookingStepIndex } from "../../types/booking";
import type { BookingContext } from "../../types/booking";
import { defaultDateWindow } from "../../utils/dates";
import { DEFAULT_COLOUR_ID } from "../../data/style-config/colours";
import { findStylist } from "../../data/stylist/stylist";

const AUTO_ADVANCE_MS = 320;
const STYLIST_ADVANCE_MS = 300;

/** Defaults to a landing-card entry: service settled, nothing else. */
function context(overrides: Partial<BookingContext> = {}): BookingContext {
  return {
    serviceId: "braids",
    styleId: null,
    stylistId: null,
    customisable: true,
    ...overrides,
  };
}

/**
 * The step lives in the URL in the real app. This stands in for the router so
 * the wizard can be exercised without one.
 */
function renderWizard(
  initial: BookingContext = context(),
  startAt: BookingStepIndex = BOOKING_STEP.style,
) {
  return renderHook(
    ({ ctx }) => {
      const [step, setStep] = useState<BookingStepIndex>(startAt);
      return useBookingWizard({
        context: ctx,
        step,
        open: true,
        goToStep: setStep,
      });
    },
    { initialProps: { ctx: initial } },
  );
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
    const { result } = renderWizard();

    expect(result.current.step).toBe(BOOKING_STEP.style);
    expect(result.current.booking.styleId).toBeNull();
    expect(result.current.booking.stylistId).toBeNull();
    // The date window is pre-filled with today → +30 days.
    expect(result.current.booking.dateFrom).toBe(defaultDateWindow().from);
    expect(result.current.booking.dateTo).toBe(defaultDateWindow().to);
    expect(result.current.booking.colourId).toBe(DEFAULT_COLOUR_ID);
    expect(result.current.booking.lengthIndex).toBe(1);
  });

  describe("step order", () => {
    it("runs service → style → when&where → stylist → customise → schedule → details → review → confirm", () => {
      const { result } = renderWizard(
        context({ serviceId: null }),
        BOOKING_STEP.service,
      );

      act(() => result.current.selectService("braids"));
      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      expect(result.current.step).toBe(BOOKING_STEP.style);

      act(() => result.current.selectStyle("cornrows"));
      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      expect(result.current.step).toBe(BOOKING_STEP.whenWhere);

      act(() => result.current.goNext());
      expect(result.current.step).toBe(BOOKING_STEP.stylist);

      act(() => result.current.selectStylist("tiwara"));
      act(() => void vi.advanceTimersByTime(STYLIST_ADVANCE_MS));
      expect(result.current.step).toBe(BOOKING_STEP.customise);

      act(() => result.current.goNext());
      expect(result.current.step).toBe(BOOKING_STEP.schedule);

      act(() => result.current.goNext());
      expect(result.current.step).toBe(BOOKING_STEP.details);

      act(() => result.current.goNext());
      expect(result.current.step).toBe(BOOKING_STEP.review);

      act(() => result.current.goNext());
      expect(result.current.step).toBe(BOOKING_STEP.confirm);
    });

    it("clamps at both ends", () => {
      const { result } = renderWizard(context(), BOOKING_STEP.service);

      act(() => result.current.goPrev());
      expect(result.current.step).toBe(BOOKING_STEP.service);

      for (let index = 0; index < 12; index += 1) {
        act(() => result.current.goNext());
      }
      expect(result.current.step).toBe(BOOKING_STEP.confirm);
    });
  });

  describe("auto-advance", () => {
    it("moves off the service step 320ms after a service is chosen", () => {
      const { result } = renderWizard(
        context({ serviceId: null }),
        BOOKING_STEP.service,
      );

      act(() => result.current.selectService("wigs"));
      expect(result.current.step).toBe(BOOKING_STEP.service);

      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      expect(result.current.step).toBe(BOOKING_STEP.style);
      expect(result.current.booking.serviceId).toBe("wigs");
    });

    it("moves off the style step 320ms after a style is chosen", () => {
      const { result } = renderWizard();

      act(() => result.current.selectStyle("cornrows"));
      expect(result.current.step).toBe(BOOKING_STEP.style);

      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      expect(result.current.step).toBe(BOOKING_STEP.whenWhere);
      expect(result.current.booking.styleId).toBe("cornrows");
    });

    it("advances 320ms after the FIRST of two quick style clicks", () => {
      const { result } = renderWizard();

      act(() => result.current.selectStyle("cornrows"));
      act(() => void vi.advanceTimersByTime(100));
      act(() => result.current.selectStyle("fulani"));

      act(() => void vi.advanceTimersByTime(220));
      expect(result.current.step).toBe(BOOKING_STEP.whenWhere);
      expect(result.current.booking.styleId).toBe("fulani");
    });

    it("moves off the stylist step 300ms after one is picked", () => {
      const { result } = renderWizard();

      act(() => result.current.selectStyle("cornrows"));
      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      act(() => result.current.goNext());

      act(() => result.current.selectStylist("nia"));
      expect(result.current.step).toBe(BOOKING_STEP.stylist);

      act(() => void vi.advanceTimersByTime(STYLIST_ADVANCE_MS));
      expect(result.current.step).toBe(BOOKING_STEP.customise);
      expect(result.current.booking.stylistId).toBe("nia");
    });

    it("picks the first style when continuing without choosing one", () => {
      const { result } = renderWizard();

      act(() => result.current.goNext());
      expect(result.current.booking.styleId).toBe("knotless");
      expect(result.current.step).toBe(BOOKING_STEP.whenWhere);
    });
  });

  describe("booking opened from a stylist", () => {
    const fromStylist = () => context({ stylistId: "nia" });

    it("skips when & where and the stylist picker", () => {
      const { result } = renderWizard(fromStylist());

      expect(result.current.sequence).toEqual([
        BOOKING_STEP.service,
        BOOKING_STEP.style,
        BOOKING_STEP.customise,
        BOOKING_STEP.schedule,
        BOOKING_STEP.details,
        BOOKING_STEP.review,
        BOOKING_STEP.confirm,
      ]);
    });

    it("goes straight from style to customise", () => {
      const { result } = renderWizard(fromStylist());

      act(() => result.current.selectStyle("cornrows"));
      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      expect(result.current.step).toBe(BOOKING_STEP.customise);
    });

    it("steps back from customise to style, not into the skipped steps", () => {
      const { result } = renderWizard(fromStylist());

      act(() => result.current.selectStyle("cornrows"));
      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      act(() => result.current.goPrev());
      expect(result.current.step).toBe(BOOKING_STEP.style);
    });

    it("carries the stylist through without asking again", () => {
      const { result } = renderWizard(fromStylist());
      expect(result.current.booking.stylistId).toBe("nia");
    });

    it("still reaches the confirmation step", () => {
      const { result } = renderWizard(fromStylist());

      for (let index = 0; index < 10; index += 1) {
        act(() => result.current.goNext());
      }
      expect(result.current.step).toBe(BOOKING_STEP.confirm);
    });
  });

  describe("a booking that arrives part-answered", () => {
    // A stylist's profile service row settles all three at once.
    it("seeds the service, style and stylist from the context", () => {
      const { result } = renderWizard(
        context({
          serviceId: "braids",
          styleId: "fulani",
          stylistId: "tiwara",
        }),
        BOOKING_STEP.customise,
      );

      const { serviceId, styleId, stylistId } = result.current.booking;
      expect({ serviceId, styleId, stylistId }).toEqual({
        serviceId: "braids",
        styleId: "fulani",
        stylistId: "tiwara",
      });
    });

    it("still keeps the service and style steps reachable with Back", () => {
      const { result } = renderWizard(
        context({
          serviceId: "braids",
          styleId: "fulani",
          stylistId: "tiwara",
        }),
        BOOKING_STEP.customise,
      );

      act(() => result.current.goPrev());
      expect(result.current.step).toBe(BOOKING_STEP.style);

      act(() => result.current.goPrev());
      expect(result.current.step).toBe(BOOKING_STEP.service);
    });

    it("drops the customise step when the service has nothing to customise", () => {
      const { result } = renderWizard(
        context({ serviceId: "treatments", customisable: false }),
        BOOKING_STEP.style,
      );

      expect(result.current.sequence).not.toContain(BOOKING_STEP.customise);

      act(() => result.current.selectStyle("deepcond"));
      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));
      expect(result.current.step).toBe(BOOKING_STEP.whenWhere);
    });
  });

  describe("what the client pays", () => {
    it("bills the stylist's own rate, not the catalogue default", () => {
      const { result } = renderWizard(
        context({ serviceId: "braids", stylistId: "tiwara" }),
        BOOKING_STEP.style,
      );

      act(() => result.current.selectStyle("knotless"));
      act(() => void vi.advanceTimersByTime(AUTO_ADVANCE_MS));

      const { price } = findStylist("tiwara")!.services.braids.knotless!;
      expect(result.current.review.money.total).toBe(price);
      expect(result.current.review.money.deposit).toBe(price * 0.25);
    });

    it("costs nothing before a service is chosen", () => {
      const { result } = renderWizard(
        context({ serviceId: null }),
        BOOKING_STEP.service,
      );

      expect(result.current.review.money.total).toBe(0);
    });
  });

  describe("when & where", () => {
    it("records the date window and location", () => {
      const { result } = renderWizard();

      act(() => result.current.setDateRange("2026-08-10", "2026-08-20"));
      act(() => result.current.setLocation("London"));

      expect(result.current.booking.dateFrom).toBe("2026-08-10");
      expect(result.current.booking.dateTo).toBe("2026-08-20");
      expect(result.current.booking.location).toBe("London");
    });
  });

  describe("the review summary", () => {
    it("reflects the live selection as soon as the step is reached", () => {
      const { result } = renderWizard();
      advanceToCustomise(result);

      act(() => result.current.goNext()); // schedule
      act(() => result.current.goNext()); // details
      act(() => result.current.goNext()); // review

      expect(result.current.step).toBe(BOOKING_STEP.review);
      // Cornrows is £60 — the summary is derived, not a stale snapshot.
      expect(result.current.review).toMatchObject({
        service: "Cornrows",
        colour: "1B Natural Black",
        size: "Medium",
        money: { total: 60, deposit: 15, balance: 45 },
      });
    });

    it("updates when an add-on is ticked", () => {
      const { result } = renderWizard();
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
      const { result } = renderWizard();
      advanceToCustomise(result);

      const { total, fee, deposit, balance } = result.current.review.money;
      expect(total).toBe(60);
      expect(fee).toBe(1.2);
      // Deposit and balance still come from the total, not total + fee.
      expect(deposit).toBe(15);
      expect(balance).toBe(45);
    });
  });

  describe("starting a new booking", () => {
    it("clears everything, including what the old partial reset kept", () => {
      const { result, rerender } = renderWizard();

      advanceToCustomise(result);
      act(() => result.current.setLocation("London"));
      act(() => result.current.selectColour("613"));
      act(() => result.current.selectLength(3));
      act(() => result.current.selectSize("Large"));
      act(() => result.current.toggleAddOn("beads"));
      act(() => result.current.selectDay(14));
      act(() => result.current.selectTime("1330"));
      act(() => result.current.updateDetails({ firstName: "Amara" }));

      rerender({ ctx: context({ serviceId: "locs" }) });

      const { booking } = result.current;
      expect(booking.serviceId).toBe("locs");
      expect(booking.styleId).toBeNull();
      expect(booking.stylistId).toBeNull();
      expect(booking.dateFrom).toBe(defaultDateWindow().from);
      expect(booking.location).toBe("");
      expect(booking.colourId).toBe(DEFAULT_COLOUR_ID);
      expect(booking.lengthIndex).toBe(1);
      // These five survived a reopen before routing. They must not now — a
      // previous client's slot and contact details cannot leak into the next.
      expect(booking.size).toBe("Medium");
      expect(booking.addOnIds).toEqual([]);
      expect(booking.dayNumber).toBeNull();
      expect(booking.timeSlotId).toBeNull();
      expect(booking.details.firstName).toBe("");
    });
  });
});
