import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatPence,
  roundToPence,
  toPence,
  toPounds,
} from "../money";

describe("formatMoney", () => {
  it("drops pence on whole pounds by default", () => {
    expect(formatMoney(85)).toBe("£85");
    expect(formatMoney(0)).toBe("£0");
    expect(formatMoney(85.004)).toBe("£85");
  });

  it("shows pence when the amount isn't whole", () => {
    expect(formatMoney(85.5)).toBe("£85.50");
    expect(formatMoney(9.99)).toBe("£9.99");
    expect(formatMoney(56.333)).toBe("£56.33");
  });

  it("always shows pence when asked", () => {
    expect(formatMoney(85, { pence: "always" })).toBe("£85.00");
    expect(formatMoney(12.5, { pence: "always" })).toBe("£12.50");
  });

  it("prefixes negatives with a minus sign", () => {
    expect(formatMoney(-20)).toBe("−£20");
    expect(formatMoney(-20.5)).toBe("−£20.50");
    expect(formatMoney(-12, { pence: "always" })).toBe("−£12.00");
    expect(formatMoney(-0.001)).toBe("£0");
  });

  it("adds thousands separators", () => {
    expect(formatMoney(1120)).toBe("£1,120");
    expect(formatMoney(1120, { pence: "always" })).toBe("£1,120.00");
    expect(formatMoney(-1234.5)).toBe("−£1,234.50");
  });
});

describe("roundToPence", () => {
  it("rounds to two decimals", () => {
    expect(roundToPence(1.005 + 0.0001)).toBe(1.01);
    expect(roundToPence(2.344)).toBe(2.34);
    expect(roundToPence(-3.456)).toBe(-3.46);
  });
});

describe("pence and pounds", () => {
  it("turns pounds into whole pence, float leftovers and all", () => {
    expect(toPence(17.26)).toBe(1726);
    expect(toPence(20 - 2.74)).toBe(1726);
  });

  it("turns pence into pounds", () => {
    expect(toPounds(3150)).toBe(31.5);
  });

  it("formats pence with pence by default, or short for whole pounds", () => {
    expect(formatPence(8500)).toBe("£85.00");
    expect(formatPence(8500, { pence: "auto" })).toBe("£85");
    expect(formatPence(1726)).toBe("£17.26");
  });
});
