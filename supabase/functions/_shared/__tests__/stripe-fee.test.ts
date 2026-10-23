import { describe, expect, it } from "vitest";
import { getStripeFee } from "../stripe-fee.ts";

describe("getStripeFee", () => {
  it("is 1.5% + 20p, rounded to the penny like get_card_fee_pence", () => {
    expect(getStripeFee(3000)).toBe(65);
    expect(getStripeFee(8500)).toBe(148);
    expect(getStripeFee(7500)).toBe(133);
  });

  it("is nothing on nothing", () => {
    expect(getStripeFee(0)).toBe(0);
  });
});
