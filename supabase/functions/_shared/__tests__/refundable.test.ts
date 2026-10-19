import { describe, expect, it } from "vitest";
import { getRefundable } from "../refundable";

describe("getRefundable", () => {
  it("is what's left on the charge after earlier refunds", () => {
    expect(getRefundable({ amount: 1663, amount_refunded: 0 })).toBe(1663);
    expect(getRefundable({ amount: 1663, amount_refunded: 1500 })).toBe(163);
    expect(getRefundable({ amount: 1663, amount_refunded: 1663 })).toBe(0);
  });

  it("is nothing when the charge isn't loaded", () => {
    expect(getRefundable("ch_1")).toBe(0);
    expect(getRefundable(null)).toBe(0);
  });
});
