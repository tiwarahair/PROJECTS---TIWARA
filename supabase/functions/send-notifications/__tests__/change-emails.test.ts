import { describe, expect, it } from "vitest";
import {
  bookingCancelled,
  bookingCode,
  bookingLinkReset,
  bookingRescheduled,
  clientCancelled,
  clientRescheduled,
} from "../change-emails";
import type { ChangedBooking } from "../change-emails";
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

  it("the new link email carries the new manage link", () => {
    const { subject, text } = bookingLinkReset(booking);

    expect(subject).toBe("Your new booking link");
    expect(text).toContain("https://dev.tiwarashouse.com/manage?token=abc");
  });
});
