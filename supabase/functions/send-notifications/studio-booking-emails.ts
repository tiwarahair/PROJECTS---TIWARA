// Emails for bookings a stylist makes in Studio: the confirm link, the booking itself, changes and auto-cancels.
import { getCalendarFile } from "../_shared/calendar-file.ts";
import { renderNotice } from "../_shared/email-layout.ts";
import type { RenderedEmail } from "../_shared/email-layout.ts";
import { formatWhen, getCancelLine } from "./booking-emails.ts";
import { pounds } from "../_shared/money.ts";
import type { BookingDetails, Terms } from "./booking-emails.ts";

export interface ConfirmLink extends BookingDetails {
  terms: Terms;
  price_pence: number;
  fee_pence: number;
  due_pence: number;
  confirm_by: string;
  confirm_url: string;
}

export interface StudioBooking extends BookingDetails {
  price_pence: number;
  manage_url: string;
  terms?: Terms;
  fee_pence?: number;
  paid_pence?: number;
}

export type StylistNotice = BookingDetails & {
  studio_url: string;
  confirm_by?: string;
};

const getWhereLine = ({ is_mobile: isMobile, stylist_name: stylist, where }: BookingDetails) =>
  isMobile ? `${stylist} will come to you at ${where}.` : `Where: ${where}.`;

const getCalendar = ({
  ref,
  service_name: service,
  stylist_name: stylist,
  starts_at: startsAt,
  ends_at: endsAt,
  where,
}: BookingDetails) => ({
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
});

const getDueLine = ({
  terms,
  price_pence: price,
  fee_pence: fee,
  due_pence: due,
  stylist_name: stylist,
}: ConfirmLink) => {
  if (terms.mode === "deposit")
    return `To confirm, pay ${pounds(due)} now: a ${pounds(terms.deposit_pence)} deposit + ${pounds(fee)} booking fee. The ${pounds(price - terms.deposit_pence)} balance is paid to ${stylist} at your appointment.`;

  if (terms.mode === "full")
    return `To confirm, pay ${pounds(due)} now: ${pounds(price)} + ${pounds(fee)} booking fee.`;

  return `To confirm, add a card and pay the ${pounds(fee)} booking fee. Your card is kept on file under ${stylist}’s policy; the ${pounds(price)} is paid at your appointment.`;
};

const confirmEmail =
  (title: string, intro: string) =>
  (booking: ConfirmLink): RenderedEmail =>
    renderNotice({
      title,
      paragraphs: [
        intro,
        `${booking.service_name} on ${formatWhen(booking.starts_at)} (UK time).`,
        getWhereLine(booking),
        getDueLine(booking),
        getCancelLine(booking.terms),
        `Please confirm by ${formatWhen(booking.confirm_by)}. If it isn’t confirmed by then, it’s cancelled and the time is released.`,
        `Booking reference: ${booking.ref}`,
      ],
      button: { label: "Confirm my appointment", url: booking.confirm_url },
      footnote: "Nothing is booked for you until you confirm.",
    });

export const confirmBooking = (booking: ConfirmLink) =>
  confirmEmail(
    `Confirm your appointment with ${booking.stylist_name}`,
    `${booking.stylist_name} has booked you in.`,
  )(booking);

export const confirmBookingChanged = (booking: ConfirmLink) =>
  confirmEmail(
    `${booking.stylist_name} changed your appointment`,
    `${booking.stylist_name} changed the appointment they booked for you, so here’s a new link. The one we sent before no longer works.`,
  )(booking);

// what's paid so far: a full payment for an old price is settled at the appointment (checkout)
const getPriceLine = ({
  price_pence: price,
  terms,
  fee_pence: fee = 0,
  paid_pence: paid = 0,
  stylist_name: stylist,
}: StudioBooking) => {
  if (paid && terms?.mode === "full") {
    const paidForService = paid - fee;

    return paidForService === price
      ? `Price: ${pounds(price)}, paid in full.`
      : `Price: ${pounds(price)}. You’ve paid ${pounds(paidForService)}; the difference is settled at your appointment.`;
  }

  if (paid && terms?.mode === "deposit")
    return `Price: ${pounds(price)}. Your ${pounds(terms.deposit_pence)} deposit counts towards it; the rest is paid to ${stylist} at your appointment.`;

  return `Price: ${pounds(price)}, paid to ${stylist} at your appointment.`;
};

const studioBookingEmail =
  (title: string, intro: string) =>
  (booking: StudioBooking): RenderedEmail => ({
    ...renderNotice({
      title,
      paragraphs: [
        intro,
        `${booking.service_name} on ${formatWhen(booking.starts_at)} (UK time).`,
        getWhereLine(booking),
        getPriceLine(booking),
        `Booking reference: ${booking.ref}`,
      ],
      button: { label: "Manage your booking", url: booking.manage_url },
      footnote: "The attached calendar file adds the appointment to your calendar.",
    }),
    attachments: [getCalendar(booking)],
  });

export const bookingAddedByStylist = (booking: StudioBooking) =>
  studioBookingEmail(
    `You’re booked in with ${booking.stylist_name}`,
    `${booking.stylist_name} has booked you in.`,
  )(booking);

export const bookingUpdatedByStylist = (booking: StudioBooking) =>
  studioBookingEmail(
    `${booking.stylist_name} changed your booking`,
    `${booking.stylist_name} made a change to your booking. Here are the details now.`,
  )(booking);

export const bookingManageLink = (booking: BookingDetails & { manage_url: string }): RenderedEmail =>
  renderNotice({
    title: `Your booking with ${booking.stylist_name}`,
    paragraphs: [
      `${booking.service_name} on ${formatWhen(booking.starts_at)} (UK time).`,
      "Use the button to see, change or cancel your booking.",
      `Booking reference: ${booking.ref}`,
    ],
    button: { label: "Manage your booking", url: booking.manage_url },
    footnote: `${booking.stylist_name} sent you this link from their studio.`,
  });

export const bookingAutoCancelled = (booking: BookingDetails): RenderedEmail =>
  renderNotice({
    title: "Your appointment wasn’t confirmed",
    paragraphs: [
      `${booking.service_name} with ${booking.stylist_name} on ${formatWhen(booking.starts_at)} (UK time) wasn’t confirmed in time, so it’s been cancelled. Nothing was charged.`,
      `To book again, contact ${booking.stylist_name}.`,
      `Booking reference: ${booking.ref}`,
    ],
    footnote: "Questions? Reply to this email.",
  });

export const autoCancelled = (booking: StylistNotice): RenderedEmail =>
  renderNotice({
    title: `Auto-cancelled: ${booking.client_name}`,
    paragraphs: [
      `${booking.client_name} didn’t confirm ${booking.service_name} on ${formatWhen(booking.starts_at)} (UK time) in time, so it was cancelled and the time is free again.`,
      `Booking reference: ${booking.ref}`,
    ],
    button: { label: "Open Studio", url: booking.studio_url },
    footnote: "You can choose which booking emails and texts you get in Studio → Settings → Notifications.",
  });

export const autoCancelSoon = (booking: StylistNotice): RenderedEmail =>
  renderNotice({
    title: `${booking.client_name} hasn’t confirmed yet`,
    paragraphs: [
      `${booking.service_name} on ${formatWhen(booking.starts_at)} (UK time) auto-cancels at ${formatWhen(String(booking.confirm_by))} unless ${booking.client_name} confirms.`,
      "You can resend or copy their link from the booking in Studio.",
      `Booking reference: ${booking.ref}`,
    ],
    button: { label: "Open Studio", url: booking.studio_url },
    footnote: "You can choose which booking emails and texts you get in Studio → Settings → Notifications.",
  });

// once the free window has closed, cancelling may cost the fee in the stylist's policy
const getReminderCancelLine = ({ terms, stylist_name: stylist }: StudioBooking) => {
  if (!terms) return null;

  if (Date.parse(terms.free_cancel_until) > Date.now()) return getCancelLine(terms);

  return terms.mode === "none"
    ? null
    : `The free cancellation window has closed, so cancelling now may mean a fee under ${stylist}’s policy.`;
};

const bookingReminder =
  (when: string) =>
  (booking: StudioBooking): RenderedEmail => {
    const cancelLine = getReminderCancelLine(booking);

    return {
      ...renderNotice({
        title: `Your appointment with ${booking.stylist_name} is ${when}`,
        paragraphs: [
          `${booking.service_name} on ${formatWhen(booking.starts_at)} (UK time).`,
          getWhereLine(booking),
          getPriceLine(booking),
          ...(cancelLine ? [cancelLine] : []),
          `Booking reference: ${booking.ref}`,
        ],
        button: { label: "Manage your booking", url: booking.manage_url },
        footnote: "Need to change something? Use the button to reschedule or cancel.",
      }),
      attachments: [getCalendar(booking)],
    };
  };

export const bookingReminder48h = bookingReminder("in 2 days");
export const bookingReminder24h = bookingReminder("tomorrow");
