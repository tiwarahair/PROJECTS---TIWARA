import { getCalendarFile } from "../_shared/calendar-file.ts";
import { renderNotice } from "../_shared/email-layout.ts";
import type { RenderedEmail } from "../_shared/email-layout.ts";
import { formatWhen, pounds } from "./booking-emails.ts";
import type { BookingDetails } from "./booking-emails.ts";

interface Cancellation {
  refund_pence: number;
  kept_pence: number;
  charge_pence: number;
}

export interface ChangedBooking extends BookingDetails {
  cancellation: Cancellation | null;
  fee_pence: number;
  manage_url: string;
}

type StylistNotice = BookingDetails & { cancellation: Cancellation | null; studio_url: string };

const getMoneyLines = ({ refund_pence: refund, kept_pence: kept, charge_pence: charge }: Cancellation, stylist: string) => [
  ...(refund ? [`${pounds(refund)} is refunded to your card. It can take 5–10 working days to show.`] : []),
  ...(kept ? [`${pounds(kept)} is kept under ${stylist}’s cancellation policy.`] : []),
  ...(charge ? [`A ${pounds(charge)} late cancellation fee is due under ${stylist}’s policy. We’ll email you about paying it.`] : []),
];

export const bookingCancelled = (booking: ChangedBooking): RenderedEmail =>
  renderNotice({
    title: "Your booking is cancelled",
    paragraphs: [
      `${booking.service_name} with ${booking.stylist_name} on ${formatWhen(booking.starts_at)} (UK time) is cancelled.`,
      ...(booking.cancellation ? getMoneyLines(booking.cancellation, booking.stylist_name) : []),
      `The ${pounds(booking.fee_pence)} booking fee isn’t refunded.`,
      `Booking reference: ${booking.ref}`,
    ],
    footnote: "If you didn’t cancel this booking, reply to this email straight away.",
  });

export const bookingRescheduled = (booking: ChangedBooking): RenderedEmail => {
  const { ref, service_name: service, stylist_name: stylist, starts_at: startsAt, ends_at: endsAt, where } = booking;

  return {
    ...renderNotice({
      title: "Your booking has moved",
      paragraphs: [
        `${service} with ${stylist} is now on ${formatWhen(startsAt)} (UK time).`,
        booking.is_mobile ? `${stylist} will come to you at ${where}.` : `Where: ${where}.`,
        `Booking reference: ${ref}`,
      ],
      button: { label: "Manage your booking", url: booking.manage_url },
      footnote: "The attached calendar file has the new time.",
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
          description: `Booking ${ref}. Manage or cancel it: ${booking.manage_url}`,
        }),
      },
    ],
  };
};

export const clientCancelled = (booking: StylistNotice): RenderedEmail => {
  const { refund_pence: refund = 0, kept_pence: kept = 0 } = booking.cancellation ?? {};

  return renderNotice({
    title: `Cancelled: ${booking.service_name}`,
    paragraphs: [
      `${booking.client_name} cancelled ${booking.service_name} on ${formatWhen(booking.starts_at)} (UK time). The time is free again.`,
      ...(refund ? [`${pounds(refund)} was refunded to them.`] : []),
      ...(kept ? [`You keep ${pounds(kept)} under your cancellation policy.`] : []),
      `Booking reference: ${booking.ref}`,
    ],
    button: { label: "Open Studio", url: booking.studio_url },
    footnote: "You can choose which booking emails and texts you get in Studio → Settings → Notifications.",
  });
};

export const clientRescheduled = (booking: StylistNotice): RenderedEmail =>
  renderNotice({
    title: `Moved: ${booking.service_name}`,
    paragraphs: [
      `${booking.client_name} moved ${booking.service_name} to ${formatWhen(booking.starts_at)} (UK time).`,
      `Booking reference: ${booking.ref}`,
    ],
    button: { label: "Open Studio", url: booking.studio_url },
    footnote: "You can choose which booking emails and texts you get in Studio → Settings → Notifications.",
  });
