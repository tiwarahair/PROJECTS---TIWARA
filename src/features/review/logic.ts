import type { ReviewPage } from "../../lib/review-api";

interface ReviewMessage {
  title: string;
  text: string;
  linkLabel: string;
  linkHref: string;
  isReload?: boolean;
}

export const MAX_REVIEW_LENGTH = 1000;

const HOME = { linkLabel: "Go to Tiwára’s House", linkHref: "/" };

/** the page's state, or why it didn't load: a missing, wrong or expired link, or anything else going wrong */
export const getClosedMessage = (
  page: ReviewPage | undefined,
  loadError = "",
): ReviewMessage => {
  if (!page && loadError && loadError !== "link_not_valid")
    return {
      title: "Something went wrong",
      text: "We couldn’t open your review. Please try again.",
      linkLabel: "Try again",
      linkHref: "/review",
      isReload: true,
    };

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
    title: "This link isn’t valid",
    text: "Use the link in the latest email we sent you. Review links work for 30 days after the appointment.",
    ...HOME,
  };
};

export const REVIEW_ERRORS: Record<string, string> = {
  rate_limited: "Too many tries. Wait a few minutes, then try again.",
  link_not_valid: "This link isn’t valid.",
};
