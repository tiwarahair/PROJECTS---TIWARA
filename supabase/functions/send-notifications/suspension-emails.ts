import { renderNotice, SUPPORT_EMAIL } from "../_shared/email-layout.ts";
import type { RenderedEmail } from "../_shared/email-layout.ts";

export interface Suspension {
  first_name: string | null;
  business_name: string;
  reason: string | null;
  studio_url: string;
}

const getGreeting = (first: string | null) => (first ? `Hi ${first}, ` : "");

export const stylistSuspended = ({
  first_name: first,
  business_name: business,
  reason,
  studio_url: url,
}: Suspension): RenderedEmail =>
  renderNotice({
    title: `${business} is suspended`,
    paragraphs: [
      `${getGreeting(first)}we’ve suspended ${business} on Tiwára’s House while we look into something.`,
      ...(reason ? [`Our reason: “${reason}”`] : []),
      "Your profile is hidden and clients can’t make new bookings. Bookings you already have carry on as booked, and payouts for them still arrive.",
      `If you think this is a mistake, reply to this email or write to ${SUPPORT_EMAIL}.`,
    ],
    button: { label: "Open Studio", url },
    footnote: "You can still sign in to Studio to manage your bookings.",
  });

export const stylistUnsuspended = ({
  first_name: first,
  business_name: business,
  studio_url: url,
}: Suspension): RenderedEmail =>
  renderNotice({
    title: `${business} is no longer suspended`,
    paragraphs: [
      `${getGreeting(first)}we’ve lifted the suspension on ${business}.`,
      "Your profile goes live again as soon as everything in Studio’s setup is done, and clients can book you.",
    ],
    button: { label: "Open Studio", url },
    footnote: "Thanks for your patience.",
  });
