// A card kept for fees that expires before the appointment: the client is asked for a new one; the stylist hears if not.
import { renderNotice } from "../_shared/email-layout.ts";
import type { RenderedEmail } from "../_shared/email-layout.ts";
import { formatWhen } from "./booking-emails.ts";
import type { BookingDetails, Terms } from "./booking-emails.ts";
import type { StylistNotice } from "./studio-booking-emails.ts";

export interface CardUpdateNeeded extends BookingDetails {
  card_label: string | null;
  terms: Terms;
  update_by: string;
  update_url: string;
}

export const cardUpdateNeeded = ({
  card_label: card,
  stylist_name: stylist,
  service_name: service,
  starts_at: startsAt,
  update_by: updateBy,
  update_url: url,
  ref,
}: CardUpdateNeeded): RenderedEmail =>
  renderNotice({
    title: "Your card expires before your appointment",
    paragraphs: [
      `${stylist} keeps ${card ? `your ${card}` : "the card you booked with"} on file for ${service} on ${formatWhen(startsAt)} (UK time), but it expires before then.`,
      `Please add a new card by ${formatWhen(updateBy)}. Nothing is charged now: the card is only used for a fee under ${stylist}’s policy, such as a late cancellation or a no-show.`,
      `Booking reference: ${ref}`,
    ],
    button: { label: "Update my card", url },
    footnote: `If you don’t, your appointment still stands, and ${stylist} will be told.`,
  });

export const cardNotReplaced = (booking: StylistNotice): RenderedEmail =>
  renderNotice({
    title: `${booking.client_name}’s card expired`,
    paragraphs: [
      `${booking.client_name}’s card on file for ${booking.service_name} on ${formatWhen(booking.starts_at)} (UK time) expires before the appointment, and they haven’t added a new one.`,
      "The booking still stands, but a late-cancellation or no-show fee can’t be charged to a card. You may want to get in touch with them.",
      `Booking reference: ${booking.ref}`,
    ],
    button: { label: "Open Studio", url: booking.studio_url },
    footnote: "You can choose which booking emails and texts you get in Studio → Settings → Notifications.",
  });
