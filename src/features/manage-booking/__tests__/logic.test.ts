import { describe, expect, it } from "vitest";
import type { ManagedBooking } from "../../../lib/manage-booking-api";
import { getCancelLines } from "../logic";

const booking = {
  stylist_name: "Tiwára's House",
  fee_pence: 163,
  terms: { mode: "deposit", deposit_pence: 1500, free_cancel_until: "" },
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
  it("in time with a deposit: refunded", () => {
    expect(getCancelLines(booking, terms(1500, 0, 0, false))).toEqual([
      "Your £15.00 deposit is refunded to your card.",
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
