import { describe, expect, it } from "vitest";
import {
  calcDeposit,
  calcPlatformFee,
  formatPence,
  formatPenceCompact,
} from "./money";

// to do: check the calcDeposit tests
describe("calcDeposit", () => {
  it("takes 25% of the total", () => {
    expect(calcDeposit(13000, calcPlatformFee(13000))).toBe(3250);
    expect(calcDeposit(6000, calcPlatformFee(6000))).toBe(1500);
    expect(calcDeposit(7500, calcPlatformFee(7500))).toBe(1875);
  });

  it("rounds a fractional penny to the nearest whole one", () => {
    // 25% of 4501 is 1125.25 — money cannot hold a quarter-penny.
    expect(calcDeposit(4501, calcPlatformFee(4501))).toBe(1125);
    expect(calcDeposit(4502, calcPlatformFee(4502))).toBe(1126); // 1125.5 rounds up
    expect(calcDeposit(10, calcPlatformFee(10))).toBe(3); // 2.5 rounds up
  });

  it("leaves no dust: deposit plus balance is always the total", () => {
    for (const total of [0, 1, 4501, 4502, 6000, 13000, 99999]) {
      const fee = calcPlatformFee(total);
      expect(calcDeposit(total, fee) + (total - calcDeposit(total, fee))).toBe(
        total,
      );
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
