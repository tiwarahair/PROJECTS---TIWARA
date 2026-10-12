import { describe, expect, it } from "vitest";
import { SEED_PROFILE, SEED_CARDS, getSeedBookings } from "../account-data";
import type { AccountBooking } from "../account-data";
import {
  formatCardDigits,
  formatCardExpiry,
  getBookingMoney,
  getCardErrors,
  validateEdit,
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

  it("validates the personal details edits", () => {
    expect(
      validateEdit("name", { ...SEED_PROFILE, first: " " }, SEED_PROFILE.email),
    ).toEqual({
      first: "Enter your first name",
    });

    expect(validateEdit("email", SEED_PROFILE, SEED_PROFILE.email)).toEqual({
      email: "That’s already your email",
    });

    expect(
      validateEdit(
        "email",
        { ...SEED_PROFILE, email: "kemi.a@icloud.com" },
        SEED_PROFILE.email,
      ),
    ).toEqual({ email: "This email is already used by another account" });

    expect(
      validateEdit(
        "mobile",
        { ...SEED_PROFILE, mobile: "07700 900123" },
        SEED_PROFILE.email,
      ),
    ).toEqual({});

    expect(
      validateEdit(
        "mobile",
        { ...SEED_PROFILE, mobile: "0123" },
        SEED_PROFILE.email,
      ),
    ).toEqual({
      mobile: "Enter a UK mobile number, like 07700 900123",
    });
  });

  it("formats and validates card details", () => {
    expect(formatCardDigits("4242424242424242999")).toBe("4242 4242 4242 4242");
    expect(formatCardExpiry("0828")).toBe("08 / 28");

    expect(getCardErrors({ number: "4242", expiry: "13", cvc: "1" })).toEqual({
      number: "Enter your card number",
      expiry: "Enter the expiry date",
      cvc: "Enter the 3 or 4-digit code",
    });

    expect(
      getCardErrors({ number: "4242424242424242", expiry: "0101", cvc: "123" }),
    ).toEqual({ expiry: "This card has expired" });
  });
});
