import { describe, expect, it } from "vitest";
import { getReversalAmount } from "../reversal-amount";

describe("getReversalAmount", () => {
  it("takes back the whole refund, like a payment sent straight away", () => {
    expect(getReversalAmount({ refunded: 2000, transferLeft: 2442 })).toBe(
      2000,
    );
  });

  it("never takes back more than the stylist was sent", () => {
    expect(getReversalAmount({ refunded: 2700, transferLeft: 2442 })).toBe(
      2442,
    );
  });

  it("takes back only what's left after earlier refunds", () => {
    expect(getReversalAmount({ refunded: 2000, transferLeft: 442 })).toBe(442);
  });

  it("is nothing when the transfer is already taken back", () => {
    expect(getReversalAmount({ refunded: 1000, transferLeft: 0 })).toBe(0);
  });
});
