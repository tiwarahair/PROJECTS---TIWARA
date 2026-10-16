import { describe, expect, it } from "vitest";
import { bookingConfirmed, newBooking } from "../booking-emails";
import type { ConfirmedBooking } from "../booking-emails";
import { renderSms, toE164 } from "../sms";

const booking: ConfirmedBooking = {
  ref: "TH-ABC123",
  service_name: "Silk press",
  stylist_name: "Tiwára's House",
  starts_at: "2026-10-22T16:30:00Z",
  ends_at: "2026-10-22T18:30:00Z",
  is_mobile: false,
  where: "Tiwára's House, 1 High St, Manchester, M1 1AA",
  client_name: "Nia Okafor",
  client_phone: "07700 900123",
  notes: "<b>Tender scalp</b>",
  address_notes: null,
  terms: {
    mode: "deposit",
    refundable: true,
    deposit_pence: 1500,
    free_cancel_until: "2026-10-20T16:30:00Z",
  },
  price_pence: 7500,
  fee_pence: 163,
  paid_pence: 1663,
  manage_url: "https://dev.tiwarashouse.com/manage?token=abcdefghijklmnopqrstuvwxyz012345",
  save_details_url: "https://dev.tiwarashouse.com/save-details?token=zyx",
};

describe("the client's confirmation email", () => {
  const email = bookingConfirmed(booking);

  it("has the service, UK time, place, payment, cancellation terms and reference", () => {
    expect(email.subject).toBe("You’re booked in with Tiwára's House");
    expect(email.text).toContain("Silk press on Thursday 22 October at 17:30 (UK time).");
    expect(email.text).toContain("Where: Tiwára's House, 1 High St, Manchester, M1 1AA.");

    expect(email.text).toContain(
      "You paid £16.63 today (£15.00 deposit + £1.63 booking fee). The £60.00 balance is paid to Tiwára's House at your appointment.",
    );

    expect(email.text).toContain(
      "Free cancellation until Tuesday 20 October at 17:30: your deposit is refunded.",
    );

    expect(email.text).toContain("Booking reference: TH-ABC123");
  });

  it("links to the manage page and, for guests, to saving their details", () => {
    expect(email.text).toContain(`Manage your booking: ${booking.manage_url}`);
    expect(email.text).toContain(`Save your details for next time: ${booking.save_details_url}`);
    expect(email.html).toContain(`href="${booking.manage_url}"`);

    expect(bookingConfirmed({ ...booking, save_details_url: null }).text).not.toContain(
      "Save your details",
    );
  });

  it("attaches the calendar file", () => {
    const [file] = email.attachments ?? [];

    expect(file).toMatchObject({ filename: "TH-ABC123.ics", contentType: "text/calendar" });
    expect(file?.content).toContain("DTSTART:20261022T163000Z");
    expect(file?.content).toContain("DTEND:20261022T183000Z");
  });

  it("words each payment mode as the client agreed", () => {
    const linesFor = (mode: ConfirmedBooking["terms"]["mode"], paid: number, refundable = true) =>
      bookingConfirmed({ ...booking, paid_pence: paid, terms: { ...booking.terms, mode, refundable } }).text;

    expect(linesFor("full", 7663)).toContain(
      "You paid £76.63 today (£75.00 + £1.63 booking fee). Nothing more to pay at your appointment.",
    );

    expect(linesFor("full", 7663)).toContain("you’re refunded in full.");

    expect(linesFor("card", 163)).toContain(
      "You paid the £1.63 booking fee today. Your card is saved, and the £75.00 is paid to Tiwára's House at your appointment.",
    );

    expect(linesFor("none", 163)).toContain("Please cancel or reschedule by Tuesday 20 October at 17:30.");
    expect(linesFor("deposit", 1663, false)).toContain("Your £15.00 deposit is non-refundable.");
  });

  it("says a mobile stylist comes to the client's address", () => {
    expect(
      bookingConfirmed({ ...booking, is_mobile: true, where: "12 Dickenson Road, M14 5TQ" }).text,
    ).toContain("Tiwára's House will come to you at 12 Dickenson Road, M14 5TQ.");
  });
});

describe("the stylist's new booking email", () => {
  it("gives a mobile stylist the client's address and how to get in", () => {
    const { text } = newBooking({
      ...booking,
      is_mobile: true,
      where: "12 Dickenson Road, M14 5TQ",
      address_notes: "Buzzer 3, side door",
      studio_url: "https://dev.tiwarashouse.com/studio",
    });

    expect(text).toContain("Their address: 12 Dickenson Road, M14 5TQ.");
    expect(text).toContain("Getting in: Buzzer 3, side door");
  });

  const email = newBooking({ ...booking, studio_url: "https://dev.tiwarashouse.com/studio" });

  it("has who, what, when, their mobile and notes, with a link to Studio", () => {
    expect(email.subject).toBe("New booking: Silk press");
    expect(email.text).toContain("Nia Okafor booked Silk press on Thursday 22 October at 17:30 (UK time).");
    expect(email.text).toContain("Mobile: 07700 900123");
    expect(email.text).toContain("Notes: <b>Tender scalp</b>");
    expect(email.text).toContain("Open Studio: https://dev.tiwarashouse.com/studio");
  });

  it("escapes what clients type, so it can't change the email", () => {
    expect(email.html).toContain("&#60;b&#62;Tender scalp&#60;/b&#62;");
    expect(email.html).not.toContain("<b>Tender scalp");
  });
});

describe("texts", () => {
  const text = renderSms("booking_confirmed", { ...booking });

  it("fits one text in the GSM-7 alphabet, with the manage link", () => {
    expect(text).toBe(
      `Booked with Tiwara's House, Thu 22 Oct, 17:30. Ref TH-ABC123. Manage: ${booking.manage_url}`,
    );

    expect(text.length).toBeLessThanOrEqual(160);
    expect(text).toMatch(/^[\x20-\x7E]+$/);
  });

  it("tells the stylist about a new booking", () => {
    expect(renderSms("new_booking", { ...booking })).toBe(
      "New booking: Nia Okafor, Silk press, Thu 22 Oct, 17:30. Ref TH-ABC123.",
    );
  });

  it("sends to UK mobiles in international format", () => {
    expect(toE164("07700 900123")).toBe("+447700900123");
    expect(toE164("+44 7700 900123")).toBe("+447700900123");
    expect(toE164("7700900123")).toBe("+447700900123");
  });
});
