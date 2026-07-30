import { describe, expect, it } from "vitest";
import { calcDeposit, formatPence } from "./money";

// to do: check the calcDeposit tests
describe("calcDeposit", () => {
  it("takes 25% rounded to the penny", () => {
    expect(calcDeposit(130)).toBe(32.5);
    expect(calcDeposit(60)).toBe(15);
    expect(calcDeposit(75)).toBe(18.75);
  });

  it("rounds to the penny before formatting, not after", () => {
    // 4.5% of a penny would survive a naive toFixed on the raw product.
    expect(calcDeposit(0.1)).toBe(0.03);
    expect(calcDeposit(45)).toBe(11.25);
  });
});

describe("formatting", () => {
  it("always shows two decimals for deposit and balance", () => {
    expect(formatPence(32.5)).toBe("£32.50");
    expect(formatPence(15)).toBe("£15.00");
    expect(formatPence(97.5)).toBe("£97.50");
  });
});
