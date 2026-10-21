import { describe, expect, it } from "vitest";
import { toCardRows } from "../cards";

const visa = {
  id: "pm_visa",
  card: { brand: "visa", last4: "4242", exp_month: 8, exp_year: 2028 },
};

const mastercard = {
  id: "pm_mc",
  card: { brand: "mastercard", last4: "4444", exp_month: 11, exp_year: 2029 },
};

describe("client cards", () => {
  it("shows each card's brand, last 4 and expiry, and the customer's default", () => {
    expect(toCardRows([visa, mastercard], "pm_mc")).toEqual([
      { id: "pm_visa", brand: "Visa", last4: "4242", expiry: "08/28", is_default: false },
      { id: "pm_mc", brand: "Mastercard", last4: "4444", expiry: "11/29", is_default: true },
    ]);
  });

  it("with no default set, the first card is shown as the default", () => {
    expect(toCardRows([visa, mastercard], null).map(({ is_default }) => is_default)).toEqual([
      true,
      false,
    ]);
  });
});
