import { describe, expect, it } from "vitest";
import type { ManagedBooking } from "../../../lib/manage-booking-api";
import {
  getCancelLines,
  getLateRescheduleWarning,
  getTermsLine,
} from "../logic";

const booking = {
  stylist_name: "Tiwára's House",
  fee_pence: 163,
  terms: {
    mode: "deposit",
    deposit_pence: 1500,
    free_cancel_until: "",
    free_window_hours: 48,
  },
} as ManagedBooking;

const terms = (
  refund: number,
  kept: number,
  charge: number,
  isLate = true,
) => ({
  is_late: isLate,
  refund_pence: refund,
  kept_pence: kept,
  charge_pence: charge,
  free_cancel_until: "",
});

describe("the cancel preview", () => {
  it("in time with a deposit: refunded with the booking fee", () => {
    expect(
      getCancelLines(booking, {
        ...terms(1663, 0, 0, false),
        fee_refund_pence: 163,
      }),
    ).toEqual([
      "£16.63 is refunded to your card, including the £1.63 booking fee.",
    ]);
  });

  it("late, part of the deposit kept", () => {
    expect(getCancelLines(booking, terms(1000, 500, 0))).toEqual([
      "It's past the free cancellation time.",
      "£10.00 is refunded to your card.",
      "£5.00 of your deposit is kept under Tiwára's House's policy.",
    ]);
  });

  it("late, the deposit kept and a fee due", () => {
    expect(getCancelLines(booking, terms(0, 1500, 2500))).toEqual([
      "It's past the free cancellation time.",
      "Your £15.00 deposit is kept under Tiwára's House's policy.",
      "A £25.00 late cancellation fee is due under Tiwára's House's policy.",
    ]);
  });

  it("paid in full, late at half", () => {
    const full = {
      ...booking,
      terms: { ...booking.terms, mode: "full" },
    } as ManagedBooking;

    expect(getCancelLines(full, terms(3750, 3750, 0))).toEqual([
      "It's past the free cancellation time.",
      "£37.50 is refunded to your card.",
      "£37.50 is kept under Tiwára's House's policy.",
    ]);
  });

  it("nothing either way", () => {
    expect(getCancelLines(booking, terms(0, 0, 0, false))).toEqual([
      "Nothing more to pay.",
    ]);
  });
});

describe("the late reschedule warning", () => {
  const now = Date.parse("2026-10-14T09:00:00Z");

  const withWindow = (hours: number) =>
    ({
      ...booking,
      terms: { ...booking.terms, free_window_hours: hours },
    }) as ManagedBooking;

  it("warns when the new time is inside the free cancellation window", () => {
    expect(getLateRescheduleWarning(booking, "2026-10-15T12:00:00Z", now)).toBe(
      "This time is within 48 hours, so free cancellation won’t apply and you can’t reschedule again.",
    );
  });

  it("says nothing when free cancellation still applies", () => {
    expect(
      getLateRescheduleWarning(booking, "2026-10-17T12:00:00Z", now),
    ).toBeNull();
  });

  it("names short windows in minutes or as one hour", () => {
    expect(
      getLateRescheduleWarning(withWindow(0.5), "2026-10-14T09:15:00Z", now),
    ).toContain("within 30 minutes,");

    expect(
      getLateRescheduleWarning(withWindow(1), "2026-10-14T09:30:00Z", now),
    ).toContain("within 1 hour,");
  });
});

describe("a stylist with no booking policy", () => {
  const noPolicy = (isLate: boolean) =>
    ({
      ...booking,
      terms: { ...booking.terms, mode: "none" },
      cancellation: terms(0, 0, 0, isLate),
    }) as ManagedBooking;

  it("after the free window, only the booking fee is kept, with no late terms", () => {
    expect(getTermsLine(noPolicy(true))).toBe(
      "The free cancellation time has passed, so the booking fee isn’t refunded.",
    );
  });

  it("warns that moving inside the window only costs the booking fee", () => {
    expect(
      getLateRescheduleWarning(
        noPolicy(false),
        "2026-10-14T10:00:00Z",
        Date.parse("2026-10-14T09:00:00Z"),
      ),
    ).toBe(
      "This time is within 48 hours, so the booking fee won’t be refunded if you cancel.",
    );
  });
});
