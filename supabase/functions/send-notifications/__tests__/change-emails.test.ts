import { describe, expect, it } from "vitest";
import {
  bookingCancelled,
  bookingCancelledByStylist,
  bookingCode,
  bookingLinkReset,
  bookingMovedByStylist,
  bookingRescheduled,
  clientCancelled,
  clientRescheduled,
} from "../change-emails";
import type { ChangedBooking } from "../change-emails";
import { disputeOpened, feeDeclined, feeScheduled, feeUnpaid, feeWaived } from "../fee-emails";
import { renderSms } from "../sms";

const booking: ChangedBooking = {
  ref: "TH-ABC123",
  service_name: "Silk press",
  stylist_name: "Tiwára's House",
  starts_at: "2026-10-22T16:30:00Z",
  ends_at: "2026-10-22T18:30:00Z",
  is_mobile: false,
  where: "Tiwára's House, 1 High St, Manchester, M1 1AA",
  client_name: "Nia Okafor",
  client_phone: "07700 900123",
  notes: null,
  address_notes: null,
  cancellation: { refund_pence: 2000, kept_pence: 1000, charge_pence: 0 },
  fee_pence: 163,
  manage_url: "https://dev.tiwarashouse.com/manage?token=abc",
  secure_url: "https://dev.tiwarashouse.com/manage?secure=xyz",
};

const studio = { studio_url: "https://dev.tiwarashouse.com/studio" };

describe("cancellation emails", () => {
  it("tell the client what's refunded and what's kept", () => {
    const { subject, text } = bookingCancelled(booking);

    expect(subject).toBe("Your booking is cancelled");
    expect(text).toContain("Silk press with Tiwára's House on Thursday 22 October at 17:30 (UK time) is cancelled.");
    expect(text).toContain("£20.00 is refunded to your card.");
    expect(text).toContain("£10.00 is kept under Tiwára's House’s cancellation policy.");
    expect(text).not.toContain("booking fee");
    expect(text).not.toContain("late cancellation fee");
  });

  it("say when a late fee is still due", () => {
    const { text } = bookingCancelled({
      ...booking,
      cancellation: { refund_pence: 0, kept_pence: 3000, charge_pence: 5000 },
    });

    expect(text).toContain("A £50.00 late cancellation fee is due under Tiwára's House’s policy.");
    expect(text).not.toContain("refunded to your card");
  });

  it("tell the client the stylist cancelled and everything is refunded", () => {
    const { subject, text } = bookingCancelledByStylist({
      ...booking,
      cancellation: { refund_pence: 3163, kept_pence: 0, charge_pence: 0 },
    });

    expect(subject).toBe("Tiwára's House cancelled your booking");
    expect(text).toContain("£31.63 is refunded to your card, including the booking fee.");
    expect(text).not.toContain("This wasn’t me");
  });

  it("tell the stylist the time is free and what they keep", () => {
    const { subject, text } = clientCancelled({ ...booking, ...studio });

    expect(subject).toBe("Cancelled: Silk press");
    expect(text).toContain("Nia Okafor cancelled Silk press on Thursday 22 October at 17:30 (UK time). The time is free again.");
    expect(text).toContain("£20.00 was refunded to them.");
    expect(text).toContain("You keep £10.00 under your cancellation policy.");
  });
});

describe("reschedule emails", () => {
  it("give the client the new time with a new calendar file", () => {
    const email = bookingRescheduled(booking);

    expect(email.text).toContain("Silk press with Tiwára's House is now on Thursday 22 October at 17:30 (UK time).");
    expect(email.text).toContain(`Manage your booking: ${booking.manage_url}`);
    expect(email.attachments?.[0]?.content).toContain("DTSTART:20261022T163000Z");
  });

  it("tell the client the stylist moved it, without asking if it was them", () => {
    const email = bookingMovedByStylist(booking);

    expect(email.subject).toBe("Tiwára's House moved your booking");
    expect(email.text).toContain(`Manage your booking: ${booking.manage_url}`);
    expect(email.text).not.toContain("This wasn’t me");
    expect(email.attachments?.[0]?.content).toContain("DTSTART:20261022T163000Z");
  });

  it("tell the stylist the new time", () => {
    expect(clientRescheduled({ ...booking, ...studio }).text).toContain(
      "Nia Okafor moved Silk press to Thursday 22 October at 17:30 (UK time).",
    );
  });
});

describe("stylist texts", () => {
  it("say what changed in one plain text", () => {
    expect(renderSms("client_cancelled", { ...booking })).toBe(
      "Cancelled: Nia Okafor, Silk press, Thu 22 Oct, 17:30. Ref TH-ABC123.",
    );

    expect(renderSms("client_rescheduled", { ...booking })).toBe(
      "Moved: Nia Okafor, Silk press, now Thu 22 Oct, 17:30. Ref TH-ABC123.",
    );
  });
});

describe("link safety emails", () => {
  it("cancellation and reschedule emails offer This wasn’t me", () => {
    for (const { text } of [bookingCancelled(booking), bookingRescheduled(booking)]) {
      expect(text).toContain("This wasn’t me");
      expect(text).toContain("https://dev.tiwarashouse.com/manage?secure=xyz");
    }
  });

  it("the code email gives the code, how long it lasts and This wasn’t me", () => {
    const { subject, text } = bookingCode({ ...booking, code: "042817" });

    expect(subject).toBe("Your code is 042817");
    expect(text).toContain("It works for 10 minutes.");
    expect(text).toContain("https://dev.tiwarashouse.com/manage?secure=xyz");
  });

  it("the new link email carries the new manage link, and a guest's new save-details link", () => {
    const { subject, text } = bookingLinkReset({ ...booking, save_details_url: null });

    expect(subject).toBe("Your new booking link");
    expect(text).toContain("https://dev.tiwarashouse.com/manage?token=abc");
    expect(text).not.toContain("Save your details");

    const guest = bookingLinkReset({ ...booking, save_details_url: "https://dev.tiwarashouse.com/save-details?token=new" });

    expect(guest.text).toContain("https://dev.tiwarashouse.com/save-details?token=new");
  });
});

describe("fee emails", () => {
  const fee = {
    ...booking,
    kind: "no_show" as const,
    fee_pence: 5000,
    kept_pence: 3000,
    refund_pence: 0,
    charge_pence: 2000,
    charge_after: "2026-10-23T16:30:00Z",
  };

  it("say what's kept, charged and refunded, and when", () => {
    const { subject, text } = feeScheduled(fee);

    expect(subject).toBe("No-show fee: £50.00");
    expect(text).toContain("£30.00 of what you paid is kept towards it.");
    expect(text).toContain("£20.00 will be charged to your saved card on Friday 23 October at 17:30.");
    expect(text).toContain("If you did attend, reply to this email");
  });

  it("explain a late cancellation fee", () => {
    const { subject, text } = feeScheduled({ ...fee, kind: "late_cancel" });

    expect(subject).toBe("Late cancellation fee: £50.00");
    expect(text).toContain("after the free cancellation deadline");
  });

  it("tell the client a fee was waived and what comes back", () => {
    const { subject, text } = feeWaived({ ...booking, kind: "no_show", fee_pence: 5000, refund_pence: 3000 });

    expect(subject).toBe("Your £50.00 fee has been waived");
    expect(text).toContain("£30.00 is refunded to your card.");
  });
});

describe("declined fee and dispute emails", () => {
  it("give the client a link to pay what the card didn't cover", () => {
    const { subject, text } = feeDeclined({
      ...booking,
      kind: "no_show",
      fee_pence: 5000,
      amount_pence: 2000,
      card_label: "Visa •••• 4242",
      expires_at: "2026-10-30T16:30:00Z",
      pay_url: "https://dev.tiwarashouse.com/pay?token=abc",
    });

    expect(subject).toBe("Pay your £20.00 no-show fee");
    expect(text).toContain("We couldn’t charge Visa •••• 4242");
    expect(text).toContain("Pay £20.00: https://dev.tiwarashouse.com/pay?token=abc");
  });

  it("tell the stylist the fee is unpaid and what they can do", () => {
    const { text } = feeUnpaid({
      ...booking,
      kind: "late_cancel",
      amount_pence: 2000,
      card_label: null,
      studio_url: "https://dev.tiwarashouse.com/studio",
    });

    expect(text).toContain("Nia Okafor’s card was declined for the £20.00 late cancellation fee");
  });

  it("tell the stylist about a dispute", () => {
    expect(disputeOpened({ ...booking, amount_pence: 3163, reason: "product_not_received" }).text).toContain(
      "The bank’s reason: product not received.",
    );
  });
});
