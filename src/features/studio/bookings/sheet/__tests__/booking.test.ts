import { describe, expect, it } from "vitest";
import type { DecoratedBooking } from "../../decorate";
import { getAddonLines, getPaymentMode } from "../booking";

const asBooking = (fields: Partial<DecoratedBooking>) =>
  fields as DecoratedBooking;

describe("booking sheet → booking helpers", () => {
  it("reads the payment mode from what was paid or protected", () => {
    expect(getPaymentMode(asBooking({ paidKind: "full" }))).toBe("full");
    expect(getPaymentMode(asBooking({ paidKind: "deposit" }))).toBe("deposit");

    expect(
      getPaymentMode(
        asBooking({
          paidKind: "none",
          protect: "link",
          protectionMode: "card",
          awaiting: false,
        }),
      ),
    ).toBe("card");

    expect(
      getPaymentMode(
        asBooking({
          paidKind: "link",
          protect: "link",
          protectionMode: "card",
          awaiting: true,
        }),
      ),
    ).toBe("none");
  });

  it("prices each add-on line by its quantity", () => {
    expect(
      getAddonLines({
        addons: [
          { id: "a", name: "Beads", price: 10, quantity: 2 },
          { id: "b", name: "", price: 5 },
        ],
      } as Parameters<typeof getAddonLines>[0]),
    ).toEqual([
      { key: "Beads2", label: "Beads × 2", value: "£20", amount: 20 },
      { key: "Add-on1", label: "Add-on", value: "£5", amount: 5 },
    ]);

    expect(getAddonLines(undefined)).toEqual([]);
  });
});
