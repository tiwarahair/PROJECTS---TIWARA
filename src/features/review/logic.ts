import type { ReviewPage } from "../../lib/review-api";

interface ReviewMessage {
  title: string;
  text: string;
  linkLabel: string;
  linkHref: string;
}

export const MAX_REVIEW_LENGTH = 1000;

const HOME = { linkLabel: "Go to Tiwára’s House", linkHref: "/" };

export const getClosedMessage = (
  page: ReviewPage | undefined,
): ReviewMessage => {
  if (page?.state === "reviewed")
    return {
      title: "Thanks for your review",
      text: `It’s now on ${page.stylist_name}’s profile, and helps other clients choose.`,
      linkLabel: `See ${page.stylist_name}’s profile`,
      linkHref: `/${page.stylist_slug}`,
    };

  if (page?.state === "unavailable")
    return {
      title: "This booking can’t be reviewed",
      text: "Only appointments that took place can be reviewed.",
      ...HOME,
    };

  return {
    title: "This link has expired",
    text: "Review links work for 30 days after the appointment.",
    ...HOME,
  };
};

export const REVIEW_ERRORS: Record<string, string> = {
  rate_limited: "Too many tries. Wait a few minutes, then try again.",
  link_not_valid: "This link has expired.",
};
