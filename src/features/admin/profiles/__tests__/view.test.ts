import { describe, expect, it } from "vitest";
import { getChecks, getChecksLine, getPriceRange, getTabs } from "../view";
import { PROFILE } from "./fixtures";

describe("profile checks", () => {
  it("passes Stripe and prices, and says what failed", () => {
    expect(getChecks(PROFILE)).toEqual([
      { label: "Identity", isOk: true, text: "Verified by Stripe" },
      {
        label: "Phone and email",
        isOk: false,
        text: "Same phone as Braids by Ifeoma",
      },
      { label: "Prices", isOk: true, text: "In the usual range" },
      { label: "Photos", isOk: false, text: "Only 5 photos" },
    ]);

    expect(getChecksLine(PROFILE)).toBe("2/4 passed");
  });

  it("names a price far from the usual one", () => {
    const [, , prices] = getChecks({
      ...PROFILE,
      flags: ["prices"],
      price_outliers: [
        { name: "Silk press", from_pence: 42000, usual_pence: 6500 },
      ],
    });

    expect(prices?.text).toBe("Silk press from £420, usually about £65");
  });
});

describe("profile list", () => {
  it("shows one price, a range, or none yet", () => {
    expect(getPriceRange(PROFILE)).toBe("£30 to £80");
    expect(getPriceRange({ ...PROFILE, max_pence: 3000 })).toBe("£30");

    expect(getPriceRange({ ...PROFILE, min_pence: null })).toBe(
      "No prices yet",
    );
  });

  it("counts each tab, with nothing loaded yet as 0", () => {
    expect(getTabs(null).map(({ count }) => count)).toEqual([0, 0, 0, 0, 0]);
  });
});
