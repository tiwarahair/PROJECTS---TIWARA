import { describe, expect, it } from "vitest";
import { getAddonMinutes, getAddonValue } from "../addon-values";

const beads = {
  id: "beads",
  categoryId: null,
  name: "Beads",
  price: "10",
  hours: 1,
  min: "15",
};

describe("new booking → add-on values", () => {
  it("reads an add-on's length in minutes", () => {
    expect(getAddonMinutes(beads)).toBe(75);
  });

  it("uses the saved add-on unless this booking overrides it", () => {
    expect(getAddonValue(beads, {})).toEqual({
      price: 10,
      minutes: 75,
      quantity: 1,
    });

    expect(
      getAddonValue(beads, { beads: { price: 12, minutes: 30, quantity: 2 } }),
    ).toEqual({ price: 12, minutes: 30, quantity: 2 });
  });
});
