import { getCalendarFile } from "../_shared/calendar-file.ts";
import { renderNotice } from "../_shared/email-layout.ts";
import type { RenderedEmail } from "../_shared/email-layout.ts";
import { formatWhen } from "./booking-emails.ts";
import { pounds } from "../_shared/money.ts";
import type { BookingDetails } from "./booking-emails.ts";

interface Cancellation {
  fee_pence?: number;
  refund_pence: number;
  kept_pence: number;
  charge_pence: number;
}

export interface ChangedBooking extends BookingDetails {
  cancellation: Cancellation | null;
  fee_pence: number;
  manage_url: string;
  secure_url: string;
}

const NOT_ME = "This wasn’t me";

type StylistNotice = BookingDetails & {
  cancellation: Cancellation | null;
  studio_url: string;
};

const getMoneyLines = (
  { fee_pence: fee = 0, refund_pence: refund, kept_pence: kept, charge_pence: charge }: Cancellation,
  stylist: string,
) => [
  // with a fee, nothing moves until the fee settles a day later
  ...(refund && fee ? [`${pounds(refund)} goes back to your card when the fee settles in 24 hours.`] : []),
  ...(refund && !fee ? [`${pounds(refund)} is refunded to your card. It can take 5–10 working days to show.`] : []),
  ...(kept ? [`${pounds(kept)} is kept under ${stylist}’s cancellation policy.`] : []),
  ...(charge
    ? [
        `A ${pounds(charge)} late cancellation fee is due under ${stylist}’s policy. We’ve emailed you when it will be charged.`,
      ]
    : []),
];

export const bookingCancelled = (booking: ChangedBooking): RenderedEmail =>
  renderNotice({
    title: "Your booking is cancelled",
    paragraphs: [
      `${booking.service_name} with ${booking.stylist_name} on ${formatWhen(booking.starts_at)} (UK time) is cancelled.`,
      ...(booking.cancellation ? getMoneyLines(booking.cancellation, booking.stylist_name) : []),
      `Booking reference: ${booking.ref}`,
    ],
    link: { label: NOT_ME, url: booking.secure_url },
    footnote: `If you didn’t cancel this booking, tap “${NOT_ME}” so your old booking link stops working, then reply to this email.`,
  });

export const bookingCancelledByStylist = (booking: ChangedBooking): RenderedEmail =>
  renderNotice({
    title: `${booking.stylist_name} cancelled your booking`,
    paragraphs: [
      `${booking.stylist_name} had to cancel ${booking.service_name} on ${formatWhen(booking.starts_at)} (UK time).`,
      ...(booking.cancellation?.refund_pence
        ? [
            `${pounds(booking.cancellation.refund_pence)} is refunded to your card, including the booking fee. It can take 5–10 working days to show.`,
          ]
        : []),
      `Booking reference: ${booking.ref}`,
    ],
    footnote: "Questions about this cancellation? Reply to this email.",
  });

const getMovedEmail = (booking: ChangedBooking, isByStylist: boolean): RenderedEmail => {
  const { ref, service_name: service, stylist_name: stylist, starts_at: startsAt, ends_at: endsAt, where } = booking;

  return {
    ...renderNotice({
      title: isByStylist ? `${stylist} moved your booking` : "Your booking has moved",
      paragraphs: [
        `${service} with ${stylist} is now on ${formatWhen(startsAt)} (UK time).`,
        booking.is_mobile ? `${stylist} will come to you at ${where}.` : `Where: ${where}.`,
        `Booking reference: ${ref}`,
      ],
      button: { label: "Manage your booking", url: booking.manage_url },
      ...(isByStylist ? {} : { link: { label: NOT_ME, url: booking.secure_url } }),
      footnote: isByStylist
        ? "The attached calendar file has the new time. If it doesn’t suit you, manage or cancel your booking from the button above."
        : `The attached calendar file has the new time. If you didn’t make this change, tap “${NOT_ME}”, then reply to this email.`,
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

export const bookingRescheduled = (booking: ChangedBooking) => getMovedEmail(booking, false);

export const bookingMovedByStylist = (booking: ChangedBooking) => getMovedEmail(booking, true);

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

export const bookingCode = (booking: BookingDetails & { code: string; secure_url: string }): RenderedEmail =>
  renderNotice({
    title: `Your code is ${booking.code}`,
    paragraphs: [
      `Enter this code to change or cancel ${booking.service_name} with ${booking.stylist_name} on ${formatWhen(booking.starts_at)} (UK time).`,
    ],
    link: { label: NOT_ME, url: booking.secure_url },
    footnote: `If you didn’t ask for this code, someone may have your booking link. Nothing changes without the code, but tap “${NOT_ME}” to stop that link working.`,
  });

export const bookingLinkReset = (
  booking: BookingDetails & {
    manage_url: string;
    save_details_url: string | null;
  },
): RenderedEmail =>
  renderNotice({
    title: "Your new booking link",
    paragraphs: [
      `Your old link for ${booking.service_name} with ${booking.stylist_name} on ${formatWhen(booking.starts_at)} (UK time) no longer works. Use this one from now on.`,
      `Booking reference: ${booking.ref}`,
    ],
    button: { label: "Manage your booking", url: booking.manage_url },
    ...(booking.save_details_url
      ? {
          link: {
            label: "Save your details for next time",
            url: booking.save_details_url,
          },
        }
      : {}),
    footnote: "If your booking was changed or cancelled and you didn’t do it, reply to this email.",
  });
