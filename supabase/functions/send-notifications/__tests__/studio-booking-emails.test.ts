import { describe, expect, it } from "vitest";
import { renderSms } from "../sms";
import {
  autoCancelled,
  autoCancelSoon,
  bookingAddedByStylist,
  bookingAutoCancelled,
  bookingUpdatedByStylist,
  confirmBooking,
  confirmBookingChanged,
} from "../studio-booking-emails";
import type { ConfirmLink } from "../studio-booking-emails";

const details = {
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
};

const link: ConfirmLink = {
  ...details,
  terms: { mode: "deposit", refundable: true, deposit_pence: 2000, free_cancel_until: "2026-10-20T16:30:00Z" },
  price_pence: 10000,
  fee_pence: 200,
  due_pence: 2200,
  confirm_by: "2026-10-21T09:00:00Z",
  confirm_url: "https://dev.tiwarashouse.com/confirm?token=abc",
};

describe("confirm link emails", () => {
  it("say what to pay, by when, and link to the confirm page", () => {
    const { subject, text, html } = confirmBooking(link);

    expect(subject).toBe("Confirm your appointment with Tiwára's House");
    expect(text).toContain("pay £22.00 now: a £20.00 deposit + £2.00 booking fee");
    expect(text).toContain("The £80.00 balance is paid to Tiwára's House at your appointment.");
    expect(text).toContain("Please confirm by Wednesday 21 October at 10:00");
    expect(html).toContain("https://dev.tiwarashouse.com/confirm?token=abc");
  });

  it("ask a card-protection client to add a card and pay only the booking fee", () => {
    const { text } = confirmBooking({ ...link, terms: { ...link.terms, mode: "card", deposit_pence: 0 }, due_pence: 200 });

    expect(text).toContain("add a card and pay the £2.00 booking fee");
  });

  it("say the old link stopped working after a change", () => {
    const { subject, text } = confirmBookingChanged(link);

    expect(subject).toBe("Tiwára's House changed your appointment");
    expect(text).toContain("The one we sent before no longer works.");
  });
});

describe("studio booking emails", () => {
  const booking = { ...details, price_pence: 7500, manage_url: "https://dev.tiwarashouse.com/manage?token=m" };

  it("tell the client they're booked in, with a calendar file and their manage link", () => {
    const { subject, text, attachments } = bookingAddedByStylist(booking);

    expect(subject).toBe("You’re booked in with Tiwára's House");
    expect(text).toContain("Price: £75.00, paid to Tiwára's House at your appointment.");
    expect(attachments?.[0]?.filename).toBe("TH-ABC123.ics");
  });

  it("tell the client about a change", () => {
    expect(bookingUpdatedByStylist(booking).subject).toBe("Tiwára's House changed your booking");
  });

  it("say a full payment for the old price is settled at the appointment", () => {
    const paid = {
      ...booking,
      price_pence: 6000,
      fee_pence: 155,
      paid_pence: 7155,
      terms: { mode: "full" as const, refundable: true, deposit_pence: 0, free_cancel_until: "2026-10-20T16:30:00Z" },
    };

    expect(bookingUpdatedByStylist(paid).text).toContain(
      "Price: £60.00. You’ve paid £70.00; the difference is settled at your appointment.",
    );
    expect(bookingUpdatedByStylist({ ...paid, price_pence: 7000 }).text).toContain("Price: £70.00, paid in full.");
  });

  it("tell both sides about an auto-cancel", () => {
    expect(bookingAutoCancelled(details).text).toContain("wasn’t confirmed in time, so it’s been cancelled. Nothing was charged.");
    expect(autoCancelled({ ...details, studio_url: "https://dev.tiwarashouse.com/studio" }).subject).toBe(
      "Auto-cancelled: Nia Okafor",
    );
    expect(
      autoCancelSoon({ ...details, studio_url: "https://dev.tiwarashouse.com/studio", confirm_by: "2026-10-21T09:00:00Z" }).text,
    ).toContain("auto-cancels at Wednesday 21 October at 10:00 unless Nia Okafor confirms");
    expect(renderSms("auto_cancelled", details)).toBe("Auto-cancelled: Nia Okafor, Silk press, Thu 22 Oct, 17:30. Ref TH-ABC123.");
  });
});
