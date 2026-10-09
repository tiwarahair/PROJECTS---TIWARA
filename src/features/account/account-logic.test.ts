import { describe, expect, it } from "vitest";
import { ME, SEED_CARDS, getSeedBookings } from "./account-data";
import type { AccountBooking } from "./account-data";
import {
  formatCardDigits,
  formatCardExpiry,
  getBookingMoney,
  getCardErrors,
  validateEdit,
} from "./account-logic";

const getBooking = (id: string): AccountBooking => {
  const booking = getSeedBookings("").find((item) => item.id === id);
  if (!booking) throw new Error("missing booking " + id);
  return booking;
};

describe("account logic", () => {
  it("cancelled bookings refund the deposit and keep the booking fee", () => {
    const money = getBookingMoney(getBooking("TH-47118"), [], SEED_CARDS);
    expect(money.tag[0]).toBe("Cancelled");
    expect(money.paid).toMatch(/^Deposit of £[\d.]+ refunded$/);
    expect(money.lines[1]).toMatchObject({
      label: "Booking fee",
      sub: "Not refundable",
    });
    expect(money.pays[0]?.label).toBe("Paid · Mastercard •••• 4444");
  });

  it("mobile stylists come to the default address, else 'your address'", () => {
    const booking = { ...getBooking("TH-48213") };
    const money = getBookingMoney(booking, [], SEED_CARDS);
    expect(money.where).toMatch(/^.+(, | will come to your address)/);
  });

  it("validates the personal details edits", () => {
    expect(validateEdit("name", { ...ME, first: " " }, ME.email)).toEqual({
      first: "Enter your first name",
    });
    expect(validateEdit("email", ME, ME.email)).toEqual({
      email: "That’s already your email",
    });
    expect(
      validateEdit("email", { ...ME, email: "kemi.a@icloud.com" }, ME.email),
    ).toEqual({ email: "This email is already used by another account" });
    expect(
      validateEdit("mob", { ...ME, mob: "07700 900123" }, ME.email),
    ).toEqual({});
    expect(validateEdit("mob", { ...ME, mob: "0123" }, ME.email)).toEqual({
      mob: "Enter a UK mobile number, like 07700 900123",
    });
  });

  it("formats and validates card details", () => {
    expect(formatCardDigits("4242424242424242999")).toBe("4242 4242 4242 4242");
    expect(formatCardExpiry("0828")).toBe("08 / 28");
    expect(getCardErrors({ num: "4242", exp: "13", cvc: "1" })).toEqual({
      num: "Enter your card number",
      exp: "Enter the expiry date",
      cvc: "Enter the 3 or 4-digit code",
    });
    expect(
      getCardErrors({ num: "4242424242424242", exp: "0101", cvc: "123" }),
    ).toEqual({ exp: "This card has expired" });
  });
});
