import type { AppealPage, ReviewOutcome } from "../../lib/review-api";
import type { PageMessageProps } from "../../components/page-message";

export const MAX_APPEAL_LENGTH = 1000;

export const OUTCOME_TEXT: Record<ReviewOutcome, string> = {
  kept: "Your review was kept.",
  text_removed:
    "The words of your review were removed. Your star rating still counts.",
  removed: "Your review was removed.",
};

const HOME = { linkLabel: "Go to Tiwára’s House", linkHref: "/" };

/** the page's state, or why it didn't load */
export const getClosedMessage = (
  page: AppealPage | undefined,
  loadError = "",
): PageMessageProps => {
  if (!page && loadError && loadError !== "link_not_valid")
    return {
      title: "Something went wrong",
      text: "We couldn’t open your appeal. Please try again.",
      linkLabel: "Try again",
      linkHref: "/appeal",
      isReload: true,
    };

  if (page?.state === "appealed")
    return {
      title: "We’ve got your appeal",
      text: "Someone from our team will look again and email you the answer.",
      ...HOME,
    };

  if (page?.state === "closed")
    return {
      title: "This decision can no longer be appealed",
      text: "Each decision can be appealed once, within 14 days.",
      ...HOME,
    };

  return {
    title: "This link has expired",
    text: "Appeal links work for 14 days after the decision.",
    ...HOME,
  };
};

export const APPEAL_ERRORS: Record<string, string> = {
  rate_limited: "Too many tries. Wait a few minutes, then try again.",
  link_not_valid: "This link has expired.",
};
