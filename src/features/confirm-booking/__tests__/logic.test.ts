import { describe, expect, it } from "vitest";
import type { BookingConfirmation } from "../../../lib/booking-confirm-api";
import {
  getClosedMessage,
  getPayLabel,
  getPolicyLines,
  isSavingCard,
} from "../logic";

const confirmation: BookingConfirmation = {
  state: "open",
  ref: "TH-ABC123",
  service_name: "Silk press",
  stylist_name: "Tiwára's House",
  stylist_slug: "tiwaras-house",
  starts_at: "2026-10-22T16:30:00Z",
  ends_at: "2026-10-22T18:30:00Z",
  is_mobile: false,
  where: "Tiwára's House, 1 High St, Manchester",
  client_first: "Nia",
  terms: {
    mode: "deposit",
    deposit_percent: 20,
    refundable: true,
    free_window_hours: 48,
    grace_minutes: 15,
    late_on: true,
    late_kind: "pct",
    late_percent: 50,
    no_show_on: false,
    no_show_kind: "keep",
    no_show_percent: 50,
    extras: [],
    deposit_pence: 2000,
    free_cancel_until: "2026-10-20T16:30:00Z",
  },
  price_pence: 10000,
  fee_pence: 200,
  due_pence: 2200,
  confirm_by: "2026-10-21T09:00:00Z",
};

describe("the confirm page", () => {
  it("states the policy in checkout's words, with what's due now", () => {
    expect(getPolicyLines(confirmation)[0]?.text).toBe(
      "Pay £22 today (£20 deposit + £2 booking fee). The £80 balance is paid to Tiwára's House at your appointment.",
    );
  });

  it("saves the card for deposit and card protection only", () => {
    expect(isSavingCard(confirmation)).toBe(true);

    expect(
      isSavingCard({
        ...confirmation,
        terms: { ...confirmation.terms, mode: "full" },
      }),
    ).toBe(false);
  });

  it("labels the button for what the client does", () => {
    expect(getPayLabel(confirmation)).toBe("Confirm and pay £22.00");

    expect(
      getPayLabel({
        ...confirmation,
        terms: { ...confirmation.terms, mode: "card" },
        due_pence: 200,
      }),
    ).toBe("Save card and pay £2.00");
  });

  it("explains a link that changed, expired or was withdrawn", () => {
    expect(
      getClosedMessage({ ...confirmation, state: "changed" }, false).title,
    ).toBe("This payment link is no longer valid");

    expect(
      getClosedMessage({ ...confirmation, state: "expired" }, false).title,
    ).toBe("This link has expired");

    expect(
      getClosedMessage({ ...confirmation, state: "unavailable" }, false).title,
    ).toBe("This booking is no longer available");

    expect(
      getClosedMessage({ ...confirmation, state: "confirmed" }, true).title,
    ).toBe("You’re booked in");

    expect(getClosedMessage(confirmation, true).title).toBe(
      "Confirming your payment",
    );

    expect(
      getClosedMessage({ ...confirmation, state: "unavailable" }, true).text,
    ).toContain("Your payment has been refunded in full.");

    expect(getClosedMessage(undefined, false).title).toBe(
      "This link isn’t valid",
    );
  });
});
