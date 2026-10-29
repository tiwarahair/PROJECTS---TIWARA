import type { CardUpdate } from "../../lib/card-update-api";
import type { PageMessageProps } from "../../components/page-message";

const HOME = { linkLabel: "Go to Tiwára’s House", linkHref: "/" };

export const getClosedMessage = (
  update: CardUpdate | undefined,
): PageMessageProps => {
  if (update?.state === "updated")
    return {
      title: "Your card is updated",
      text: `Thanks. Nothing has been charged: ${update.stylist_name} only uses it for a fee under their policy.`,
      linkLabel: `Book with ${update.stylist_name}`,
      linkHref: `/${update.stylist_slug}`,
    };

  if (update?.state === "expired")
    return {
      title: "This appointment has passed",
      text: "There’s no card to update.",
      ...HOME,
    };

  if (update?.state === "unavailable")
    return {
      title: "No card is needed",
      text: `This booking was cancelled or has finished. Questions? Contact ${update.stylist_name}.`,
      ...HOME,
    };

  return {
    title: "This link isn’t valid",
    text: "Use the link in the latest email we sent you.",
    ...HOME,
  };
};

export const UNSAVED_MESSAGE: PageMessageProps = {
  title: "We’re still saving your card",
  text: "Your card went through, but we couldn’t finish saving it. Check again in a minute. Nothing has been charged.",
  linkLabel: "Check again",
  linkHref: "/card",
};

export const CARD_UPDATE_ERRORS: Record<string, string> = {
  card_updated: "Your card is already updated.",
  link_expired: "This appointment has passed, so there’s no card to update.",
  booking_unavailable:
    "This booking is no longer active, so no card is needed.",
  link_not_valid:
    "This link no longer works. Use the link in our latest email.",
  turnstile_failed: "We couldn't check this browser. Try again.",
  rate_limited: "Too many tries. Wait a few minutes, then try again.",
};
