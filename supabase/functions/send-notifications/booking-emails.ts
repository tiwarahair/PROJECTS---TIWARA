import { getCalendarFile } from "../_shared/calendar-file.ts";
import { renderNotice } from "../_shared/email-layout.ts";
import type { RenderedEmail } from "../_shared/email-layout.ts";

export interface BookingDetails {
  ref: string;
  service_name: string;
  stylist_name: string;
  starts_at: string;
  ends_at: string;
  is_mobile: boolean;
  where: string;
  client_name: string;
  client_phone: string;
  notes: string | null;
  address_notes: string | null;
}

interface Terms {
  mode: "none" | "deposit" | "full" | "card";
  refundable: boolean;
  deposit_pence: number;
  free_cancel_until: string;
}

export interface ConfirmedBooking extends BookingDetails {
  terms: Terms;
  price_pence: number;
  fee_pence: number;
  paid_pence: number;
  manage_url: string;
  save_details_url: string | null;
}

const londonDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "long",
  day: "numeric",
  month: "long",
});

const londonClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatWhen = (iso: string) => `${londonDay.format(new Date(iso))} at ${londonClock.format(new Date(iso))}`;

export const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

const getPaidLine = ({ terms, price_pence: price, fee_pence: fee, paid_pence: paid, stylist_name: stylist }: ConfirmedBooking) => {
  if (terms.mode === "deposit")
    return `You paid ${pounds(paid)} today (${pounds(terms.deposit_pence)} deposit + ${pounds(fee)} booking fee). The ${pounds(price - terms.deposit_pence)} balance is paid to ${stylist} at your appointment.`;

  if (terms.mode === "full")
    return `You paid ${pounds(paid)} today (${pounds(price)} + ${pounds(fee)} booking fee). Nothing more to pay at your appointment.`;

  const saved = terms.mode === "card" ? " Your card is saved, and the" : " The";

  return `You paid the ${pounds(fee)} booking fee today.${saved} ${pounds(price)} is paid to ${stylist} at your appointment.`;
};

const getCancelLine = ({ mode, refundable, deposit_pence: deposit, free_cancel_until: until }: Terms) => {
  const deadline = formatWhen(until);

  if (mode === "deposit")
    return refundable
      ? `Free cancellation until ${deadline}: your deposit is refunded.`
      : `Cancel or reschedule until ${deadline} at no extra charge. Your ${pounds(deposit)} deposit is non-refundable.`;

  if (mode === "full") return `Free cancellation until ${deadline}: you’re refunded in full.`;

  if (mode === "card") return `Free cancellation until ${deadline}.`;

  return `Please cancel or reschedule by ${deadline}.`;
};

export const bookingConfirmed = (booking: ConfirmedBooking): RenderedEmail => {
  const { ref, service_name: service, stylist_name: stylist, starts_at: startsAt, ends_at: endsAt, where } = booking;

  return {
    ...renderNotice({
      title: `You’re booked in with ${stylist}`,
      paragraphs: [
        `${service} on ${formatWhen(startsAt)} (UK time).`,
        booking.is_mobile ? `${stylist} will come to you at ${where}.` : `Where: ${where}.`,
        getPaidLine(booking),
        getCancelLine(booking.terms),
        `Booking reference: ${ref}`,
      ],
      button: { label: "Manage your booking", url: booking.manage_url },
      ...(booking.save_details_url
        ? { link: { label: "Save your details for next time", url: booking.save_details_url } }
        : {}),
      footnote: "The attached calendar file adds the appointment to your calendar.",
    }),
    attachments: [
      {
        filename: `${ref}.ics`,
        contentType: "text/calendar",
        content: getCalendarFile({
          ref,
          title: `${service} with ${stylist}`,
          startsAt,
          endsAt,
          location: where,
          description: `Booking ${ref}. Manage or cancel it from your booking email.`,
        }),
      },
    ],
  };
};

export const newBooking = (booking: BookingDetails & { studio_url: string }): RenderedEmail =>
  renderNotice({
    title: `New booking: ${booking.service_name}`,
    paragraphs: [
      `${booking.client_name} booked ${booking.service_name} on ${formatWhen(booking.starts_at)} (UK time).`,
      `Mobile: ${booking.client_phone}`,
      ...(booking.is_mobile ? [`Their address: ${booking.where}.`] : []),
      ...(booking.address_notes ? [`Getting in: ${booking.address_notes}`] : []),
      ...(booking.notes ? [`Notes: ${booking.notes}`] : []),
      `Booking reference: ${booking.ref}`,
    ],
    button: { label: "Open Studio", url: booking.studio_url },
    footnote: "You can choose which booking emails and texts you get in Studio → Settings → Notifications.",
  });
