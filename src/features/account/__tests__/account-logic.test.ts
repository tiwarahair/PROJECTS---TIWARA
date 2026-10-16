import { describe, expect, it } from "vitest";
import { SEED_CARDS, getSeedBookings } from "../account-data";
import type { AccountBooking } from "../account-data";
import {
  formatCardDigits,
  formatCardExpiry,
  getBookingMoney,
} from "../account-logic";

const getBooking = (id: string): AccountBooking => {
  const booking = getSeedBookings("").find((item) => item.id === id);

  if (!booking) throw new Error(`missing booking ${id}`);

  return booking;
};

describe("account logic", () => {
  it("cancelled bookings refund the deposit and keep the booking fee", () => {
    const money = getBookingMoney(getBooking("TH-47118"), [], SEED_CARDS);

    expect(money.tag[0]).toBe("Cancelled");
    expect(money.paid).toMatch(/^Deposit of £[\d.]+ refunded$/);

    expect(money.lines[1]).toMatchObject({
      label: "Booking fee",
      subtitle: "Not refundable",
    });

    expect(money.payments[0]?.label).toBe("Paid · Mastercard •••• 4444");
  });

  it("mobile stylists come to the default address, else 'your address'", () => {
    const booking = { ...getBooking("TH-48213") };
    const money = getBookingMoney(booking, [], SEED_CARDS);

    expect(money.where).toMatch(/^.+(, | will come to your address)/);
  });

  it("formats card details", () => {
    expect(formatCardDigits("4242424242424242999")).toBe("4242 4242 4242 4242");
    expect(formatCardExpiry("0828")).toBe("08 / 28");
  });
});
