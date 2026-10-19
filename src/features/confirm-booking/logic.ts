import type { BookingConfirmation } from "../../lib/booking-confirm-api";
import { toPolicy } from "../../lib/public-stylist";
import { policyLines } from "../../utils/pricing";
import { formatPence } from "../pay-fee/logic";

/** the stylist's policy as the client agrees to it, in the same words as online checkout. */
export const getPolicyLines = ({
  terms,
  price_pence: price,
  stylist_name: stylist,
}: BookingConfirmation) =>
  policyLines(toPolicy(terms), price / 100, stylist).lines;

/** deposit & card protection keep the card for any fee under the policy. */
export const isSavingCard = ({ terms }: BookingConfirmation) =>
  terms.mode === "deposit" || terms.mode === "card";

export const getPayLabel = ({ terms, due_pence: due }: BookingConfirmation) =>
  terms.mode === "card"
    ? `Save card and pay ${formatPence(due)}`
    : `Confirm and pay ${formatPence(due)}`;

interface ConfirmMessage {
  title: string;
  text: string;
  linkLabel: string;
  linkHref: string;
}

const HOME = { linkLabel: "Go to Tiwára’s House", linkHref: "/" };

const getStateMessage = (
  confirmation: BookingConfirmation | undefined,
): ConfirmMessage => {
  const stylist = confirmation?.stylist_name ?? "your stylist";

  if (confirmation?.state === "confirmed")
    return {
      title: "You’re booked in",
      text: "We’ve emailed you the details and a link to manage your booking.",
      ...HOME,
    };

  if (confirmation?.state === "changed")
    return {
      title: "This payment link is no longer valid",
      text: `The appointment details have changed. Please use the latest link from ${stylist}.`,
      ...HOME,
    };

  if (confirmation?.state === "expired")
    return {
      title: "This link has expired",
      text: `The appointment wasn’t confirmed in time. Contact ${stylist} to book again.`,
      ...HOME,
    };

  if (confirmation?.state === "unavailable")
    return {
      title: "This booking is no longer available",
      text: `Contact ${stylist} if you’d still like to book.`,
      ...HOME,
    };

  return {
    title: "This link isn’t valid",
    text: "Use the link in the latest email we sent you.",
    ...HOME,
  };
};

/** After paying, the booking is only confirmed once the payment is checked; a payment it no longer needed is refunded. */
export const getClosedMessage = (
  confirmation: BookingConfirmation | undefined,
  isPaid: boolean,
): ConfirmMessage => {
  if (!isPaid || confirmation?.state === "confirmed")
    return getStateMessage(confirmation);

  if (!confirmation || confirmation.state === "open")
    return {
      title: "Confirming your payment",
      text: "This takes a few seconds. We’ll email you as soon as you’re booked in.",
      ...HOME,
    };

  const message = getStateMessage(confirmation);

  return {
    ...message,
    text: `${message.text} Your payment has been refunded in full.`,
  };
};

export const CONFIRM_ERRORS: Record<string, string> = {
  already_confirmed: "This appointment is already confirmed.",
  payment_processing:
    "Your payment is being confirmed. Check back in a minute.",
  confirm_link_changed:
    "The appointment details have changed. Use the latest link we sent you.",
  link_expired: "This link has expired.",
  booking_unavailable: "This booking is no longer available.",
  link_not_valid:
    "This link no longer works. Use the link in our latest email.",
  turnstile_failed: "We couldn't check this browser. Try again.",
  rate_limited: "Too many tries. Wait a few minutes, then try again.",
};
