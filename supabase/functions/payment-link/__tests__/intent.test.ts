import { describe, expect, it } from "vitest";
import { isCurrentIntent } from "../intent";

describe("isCurrentIntent", () => {
  it("keeps a payment that's open, confirming or paid, so the client can't pay twice", () => {
    expect(isCurrentIntent({ status: "requires_payment_method" })).toBe(true);
    expect(isCurrentIntent({ status: "requires_action" })).toBe(true);
    expect(isCurrentIntent({ status: "processing" })).toBe(true);
    expect(isCurrentIntent({ status: "succeeded", latest_charge: { amount_refunded: 0 } })).toBe(true);
  });

  it("replaces a cancelled payment, or a paid one that was refunded before the link was reopened", () => {
    expect(isCurrentIntent({ status: "canceled" })).toBe(false);
    expect(isCurrentIntent({ status: "succeeded", latest_charge: { amount_refunded: 5000 } })).toBe(false);
  });
});
