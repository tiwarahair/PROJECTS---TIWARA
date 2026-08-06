import { describe, expect, it } from "vitest";
import {
  calcDeposit,
  calcPlatformFee,
  formatPence,
  formatPenceCompact,
} from "./money";

// to do: check the calcDeposit tests
describe("calcDeposit", () => {
  /** The deposit is 25% of what is actually owed — the total plus the fee. */
  const depositOf = (total: number) =>
    calcDeposit(total, calcPlatformFee(total));

  it("takes 25% of the total plus the platform fee", () => {
    expect(depositOf(13000)).toBe(3315); // 25% of 13260
    expect(depositOf(6000)).toBe(1530); // 25% of 6120
    expect(depositOf(7500)).toBe(1913); // 25% of 7650, rounded up from 1912.5
  });

  it("rounds a fractional penny to the nearest whole one", () => {
    // 4501 + 90 fee = 4591; a quarter of that is 1147.75, which money cannot hold.
    expect(depositOf(4501)).toBe(1148);
    expect(depositOf(10)).toBe(3); // fee rounds to 0, then 2.5 rounds up
  });

  it("leaves no dust: what is due now plus the balance is what is owed", () => {
    for (const total of [0, 1, 4501, 4502, 6000, 13000, 99999]) {
      const owed = total + calcPlatformFee(total);
      const deposit = depositOf(total);
      expect(deposit + (owed - deposit)).toBe(owed);
      expect(Number.isInteger(deposit)).toBe(true);
    }
  });
});

describe("calcPlatformFee", () => {
  it("takes 2% of the total", () => {
    expect(calcPlatformFee(13000)).toBe(260);
    expect(calcPlatformFee(6000)).toBe(120);
    expect(calcPlatformFee(7500)).toBe(150);
  });

  it("rounds to a whole penny", () => {
    expect(calcPlatformFee(5525)).toBe(111); // 110.5 rounds up
    expect(calcPlatformFee(10)).toBe(0); // 0.2 rounds down
  });
});

describe("formatting", () => {
  it("always shows two decimals for deposit and balance", () => {
    expect(formatPence(3250)).toBe("£32.50");
    expect(formatPence(1500)).toBe("£15.00");
    expect(formatPence(9750)).toBe("£97.50");
    expect(formatPence(0)).toBe("£0.00");
  });

  it("drops the decimals on whole pounds for the 'from' labels", () => {
    expect(formatPenceCompact(13000)).toBe("£130");
    expect(formatPenceCompact(500)).toBe("£5");
    expect(formatPenceCompact(0)).toBe("£0");
  });

  it("keeps the decimals when there are stray pence", () => {
    expect(formatPenceCompact(13050)).toBe("£130.50");
    expect(formatPenceCompact(1)).toBe("£0.01");
  });
});
