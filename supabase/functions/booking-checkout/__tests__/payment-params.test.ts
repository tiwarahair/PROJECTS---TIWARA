import { describe, expect, it } from "vitest";
import { getPaymentParams, paysStylist } from "../payment-params";
import type { CheckoutQuote } from "../payment-params";

const quote = (mode: CheckoutQuote["mode"], due: number): CheckoutQuote => ({
  id: "booking-1",
  ref: "TH-ABC123",
  mode,
  due_today_pence: due,
  fee_pence: 163,
  service_name: "Silk press",
  stylist_account: "acct_stylist",
  stylist_name: "Tiwára's House",
  customer_id: null,
  payment_intent_id: null,
});

describe("the booking's payment", () => {
  it("deposit: a destination charge of deposit + fee, keeping the fee and the stylist's card fee, the card saved", () => {
    expect(getPaymentParams(quote("deposit", 2413), "cus_1")).toMatchObject({
      amount: 2413,
      currency: "gbp",
      customer: "cus_1",
      setup_future_usage: "off_session",
      // £1.63 booking fee + 1.5% of the £22.50 deposit + 20p
      application_fee_amount: 217,
      transfer_data: { destination: "acct_stylist" },
      metadata: { booking_id: "booking-1", booking_ref: "TH-ABC123" },
    });
  });

  it("full: a destination charge of price + fee, the card not saved", () => {
    const params = getPaymentParams(quote("full", 7663), null);

    expect(params).toMatchObject({
      amount: 7663,
      application_fee_amount: 296,
      transfer_data: { destination: "acct_stylist" },
    });

    expect(params).not.toHaveProperty("setup_future_usage");
    expect(params).not.toHaveProperty("customer");
  });

  it("card on file: the fee only, for the platform, with the card saved", () => {
    const params = getPaymentParams(quote("card", 163), "cus_1");

    expect(params).toMatchObject({ amount: 163, setup_future_usage: "off_session" });
    expect(params).not.toHaveProperty("transfer_data");
    expect(params).not.toHaveProperty("application_fee_amount");
  });

  it("pay at the appointment: the fee only, for the platform, nothing saved", () => {
    const params = getPaymentParams(quote("none", 163), null);

    expect(params).toMatchObject({ amount: 163 });
    expect(params).not.toHaveProperty("transfer_data");
    expect(params).not.toHaveProperty("setup_future_usage");
  });

  it("a signed-in client is asked for a saved card's CVC, and saving one for next time is their own tick", () => {
    const params = getPaymentParams(quote("full", 7663), "cus_1", true);

    expect(params).toMatchObject({
      payment_method_options: { card: { require_cvc_recollection: true } },
    });

    expect(params).not.toHaveProperty("setup_future_usage");
  });

  it("guests aren't asked for a CVC again, having no saved cards", () => {
    expect(getPaymentParams(quote("full", 7663), "cus_1")).toMatchObject({
      payment_method_options: { card: { require_cvc_recollection: false } },
    });
  });

  it("a new stylist's deposit stays with us, marked as held", () => {
    const params = getPaymentParams(quote("deposit", 2663), "cus_1", false, 0, true);

    expect(params).toMatchObject({ amount: 2663, metadata: { hold: "true" } });
    expect(params).not.toHaveProperty("transfer_data");
    expect(params).not.toHaveProperty("application_fee_amount");
  });

  it("only takes cards, so paying never leaves the page", () => {
    expect(getPaymentParams(quote("none", 163), null)).toMatchObject({
      allowed_payment_method_types: ["card"],
    });
  });
});

describe("which bookings need the stylist's Stripe account", () => {
  it("deposit and full pay the stylist; card on file and pay at the appointment don't", () => {
    expect(["deposit", "full", "card", "none"].map((mode) => paysStylist(mode as CheckoutQuote["mode"]))).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });
});
