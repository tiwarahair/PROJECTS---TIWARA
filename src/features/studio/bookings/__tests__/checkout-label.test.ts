import { describe, expect, it } from "vitest";
import type { CheckoutRecord } from "../../core/types";
import { getCheckoutLabel } from "../checkout-label";

const asCheckout = (fields: Partial<CheckoutRecord>) =>
  ({ refundAuto: 0, ...fields }) as CheckoutRecord;

describe("getCheckoutLabel", () => {
  it("shows what's due in pounds and pence, without float leftovers", () => {
    expect(
      getCheckoutLabel(asCheckout({ method: "link", charged: 20 - 2.74 })),
    ).toBe("Link sent · £17.26 due");

    expect(
      getCheckoutLabel(asCheckout({ method: "link", charged: 31.5 })),
    ).toBe("Link sent · £31.50 due");
  });

  it("keeps whole pounds short", () => {
    expect(getCheckoutLabel(asCheckout({ method: "link", charged: 85 }))).toBe(
      "Link sent · £85 due",
    );
  });
});
