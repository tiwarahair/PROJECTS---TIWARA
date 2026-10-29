import { describe, expect, it } from "vitest";
import type { PaymentLink } from "../../../lib/payment-link-api";
import { getClosedMessage, LINK_PAY_ERRORS } from "../logic";

describe("pay-fee messages", () => {
  it("an expired link points to help for a new one", () => {
    const expired = { status: "expired", kind: "no_show" } as PaymentLink;

    expect(getClosedMessage(expired)).toMatchObject({
      text: "Contact us and we’ll send a new one.",
      linkLabel: "Contact us",
      linkHref: "/help",
    });

    expect(LINK_PAY_ERRORS.link_expired).toBe(
      "This link has expired. Contact us for a new one.",
    );
  });
});
