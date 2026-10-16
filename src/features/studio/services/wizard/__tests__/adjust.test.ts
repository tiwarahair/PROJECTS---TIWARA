import { describe, expect, it } from "vitest";
import type { VariationRow } from "../../../core/types";
import {
  getAbsolute,
  getSign,
  getSigned,
  getVariationErrors,
  getWizardBase,
  isNegative,
} from "../adjust";
import { getReview } from "../review-view";

const base = getWizardBase({
  price: "40",
  durationHours: "1",
  durationMinutes: "30",
} as Parameters<typeof getWizardBase>[0]);

const makeRow = (patch: Partial<VariationRow> = {}): VariationRow => ({
  label: "Small",
  on: true,
  priceDelta: "0",
  hoursDelta: "0",
  minutesDelta: "0",
  ...patch,
});

describe("wizard adjustments", () => {
  it("reads the base price and time", () => {
    expect(base).toEqual({
      basePrice: 40,
      baseHours: 1,
      baseMinutes: 30,
      totalMinutes: 90,
    });
  });

  it("cleans and signs deltas", () => {
    expect(getAbsolute("−05")).toBe("5");
    expect(getAbsolute("")).toBe("0");
    expect(getSigned("5", true)).toBe("-5");
    expect(getSigned("0", true)).toBe("0");
    expect(isNegative({ priceDelta: "-5" })).toBe(true);
    expect(getSign(true).signText).toBe("−");
  });

  it("flags a take-off bigger than the base", () => {
    const row = makeRow({ negative: true, priceDelta: "-50" });

    expect(getVariationErrors(row, base)).toEqual({
      priceError: "This would make the price less than £0.",
      timeError: "",
    });

    expect(getVariationErrors({ ...row, on: false }, base).priceError).toBe("");
  });

  it("builds the review grid", () => {
    const review = getReview(
      {
        sizesOn: true,
        lengthsOn: true,
        sizes: [makeRow({ priceDelta: "10" })],
        lengths: [makeRow({ label: "Long", minutesDelta: "30" })],
      } as Parameters<typeof getReview>[0],
      base,
    );

    expect(review.isGrid).toBe(true);
    expect(review.head).toEqual(["Long"]);
    expect(review.rows[0]?.cells[0]?.price).toBe("£50");
  });
});
