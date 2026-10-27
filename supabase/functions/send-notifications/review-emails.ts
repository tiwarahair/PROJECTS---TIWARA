// Reviews: the client's invite and reminder after a completed booking, the stylist's new-review notice, and the reply.
import { renderNotice } from "../_shared/email-layout.ts";
import type { RenderedEmail } from "../_shared/email-layout.ts";
import { formatWhen } from "./booking-emails.ts";
import type { BookingDetails } from "./booking-emails.ts";

export interface ReviewInvite extends BookingDetails {
  client_first: string | null;
  expires_at: string;
  review_url: string;
}

export interface ReviewReceived extends BookingDetails {
  rating: number;
  body: string | null;
  studio_url: string;
}

export interface ReviewReply extends BookingDetails {
  client_first: string | null;
  reply: string;
  profile_url: string;
}

const londonDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "long",
});

const getStars = (rating: number) => `${rating} out of 5 star${rating === 1 ? "" : "s"}`;

const reviewInvite =
  (isReminder: boolean) =>
  ({
    client_first: first,
    stylist_name: stylist,
    service_name: service,
    starts_at: startsAt,
    expires_at: expiresAt,
    review_url: url,
  }: ReviewInvite): RenderedEmail =>
    renderNotice({
      title: isReminder ? `There’s still time to review ${stylist}` : `How was your visit to ${stylist}?`,
      paragraphs: [
        `${first ? `Hi ${first}, thanks` : "Thanks"} for booking ${service} on ${formatWhen(startsAt)} (UK time).`,
        "Your review helps other clients choose a stylist. It takes a minute: a star rating, and a few words if you like.",
        "Reviews are public and can’t be changed once posted.",
      ],
      button: { label: "Leave a review", url },
      footnote: `This link works until ${londonDate.format(new Date(expiresAt))}.${isReminder ? " This is the only reminder we’ll send." : ""}`,
    });

export const reviewInvited = reviewInvite(false);

export const reviewReminder = reviewInvite(true);

export const reviewReceived = ({
  client_name: client,
  service_name: service,
  starts_at: startsAt,
  rating,
  body,
  studio_url: url,
}: ReviewReceived): RenderedEmail =>
  renderNotice({
    title: `New review: ${getStars(rating)}`,
    paragraphs: [
      `${client} reviewed ${service} on ${formatWhen(startsAt)} (UK time).`,
      ...(body ? [`“${body}”`] : []),
      "You can reply publicly from Reviews in Studio.",
    ],
    button: { label: "Open Reviews", url },
    footnote: "You can choose which emails and texts you get in Studio → Settings → Notifications.",
  });

export const reviewReplied = ({
  client_first: first,
  stylist_name: stylist,
  service_name: service,
  reply,
  profile_url: url,
}: ReviewReply): RenderedEmail =>
  renderNotice({
    title: `${stylist} replied to your review`,
    paragraphs: [`${first ? `Hi ${first}, ${stylist}` : stylist} replied to your review of ${service}:`, `“${reply}”`],
    button: { label: "See it on their profile", url },
    footnote: "Replies are public, on the stylist’s profile.",
  });
