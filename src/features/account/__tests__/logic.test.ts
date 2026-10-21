import { describe, expect, it } from "vitest";
import type { AccountBooking, SavedCard } from "../data";
import { formatCardDigits, formatCardExpiry, getBookingMoney } from "../logic";

const CARDS: SavedCard[] = [
  { id: "c1", brand: "Visa", last4: "4242", expiry: "08/28", isDefault: true },
  {
    id: "c2",
    brand: "Mastercard",
    last4: "4444",
    expiry: "03/27",
    isDefault: false,
  },
];

const getBooking = (patch: Partial<AccountBooking>): AccountBooking => ({
  id: "TH-47118",
  stylistId: "studio-zuri",
  service: "Knotless braids",
  customisation: "Medium · Mid-back",
  extra: 15,
  fallbackPrice: 150,
  at: Date.now() - 34 * 864e5,
  minutes: 300,
  status: "cancelled",
  mode: "deposit",
  card: "c2",
  ...patch,
});

describe("account logic", () => {
  it("cancelled bookings refund the deposit and keep the booking fee", () => {
    const money = getBookingMoney(getBooking({}), [], CARDS);

    expect(money.tag[0]).toBe("Cancelled");
    expect(money.paid).toMatch(/^Deposit of £[\d.]+ refunded$/);

    expect(money.lines[1]).toMatchObject({
      label: "Booking fee",
      subtitle: "Not refundable",
    });

    expect(money.payments[0]?.label).toBe("Paid · Mastercard •••• 4444");
  });

  it("mobile stylists come to the default address, else 'your address'", () => {
    const booking = getBooking({
      stylistId: "amara-beauty",
      status: "confirmed",
      at: Date.now() + 9 * 864e5,
    });

    const money = getBookingMoney(booking, [], CARDS);

    expect(money.where).toMatch(/^.+(, | will come to your address)/);
  });

  it("formats card details", () => {
    expect(formatCardDigits("4242424242424242999")).toBe("4242 4242 4242 4242");
    expect(formatCardExpiry("0828")).toBe("08 / 28");
  });
});
