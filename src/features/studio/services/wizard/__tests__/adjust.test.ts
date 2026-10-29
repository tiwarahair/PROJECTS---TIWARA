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

  it("shows pence and leaves no maths artefacts in review prices", () => {
    const review = getReview(
      {
        sizesOn: true,
        lengthsOn: false,
        sizes: [
          makeRow({ priceDelta: "2.2" }),
          makeRow({ label: "Large", priceDelta: "-0.1" }),
        ],
      } as Parameters<typeof getReview>[0],
      getWizardBase({
        price: "10.1",
        durationHours: "1",
        durationMinutes: "0",
      } as Parameters<typeof getWizardBase>[0]),
    );

    expect(review.items.map(({ price }) => price)).toEqual(["£12.30", "£10"]);
  });

  it("lists own customisations as the change they add to any combination", () => {
    const review = getReview(
      {
        sizesOn: false,
        lengthsOn: false,
        own: [
          {
            name: "Parting",
            options: [
              { label: "Middle", priceDelta: "5", minutesDelta: "15" },
              { label: "Side", priceDelta: "0", minutesDelta: "0" },
              {
                label: "Quick",
                negative: true,
                priceDelta: "-2.5",
                minutesDelta: "-5",
              },
            ],
          },
        ],
      } as Parameters<typeof getReview>[0],
      base,
    );

    expect(review.own).toEqual([
      {
        name: "Parting",
        options: [
          { label: "Middle", change: "+£5 +15m" },
          { label: "Side", change: "No change" },
          { label: "Quick", change: "−£2.50 −5m" },
        ],
      },
    ]);
  });
});
