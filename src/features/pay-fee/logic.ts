import type { PaymentLink } from "../../lib/payment-link-api";
import { formatMoney } from "../../utils/money";

const FEE_NAMES = {
  late_cancel: "Late cancellation fee",
  no_show: "No-show fee",
};

const londonWhen = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const formatPence = (pence: number) =>
  formatMoney(pence / 100, { pence: "always" });

export const getFeeName = ({ kind }: PaymentLink) => FEE_NAMES[kind];

export const formatWhen = (iso: string) => londonWhen.format(new Date(iso));

/** The part of the fee the client's earlier payment already covered. */
export const getCovered = ({
  fee_pence: fee,
  amount_pence: due,
}: PaymentLink) => Math.max(0, fee - due);

interface LinkMessage {
  title: string;
  text: string;
  linkLabel: string;
  linkHref: string;
}

export const getClosedMessage = (
  link: PaymentLink | undefined,
): LinkMessage => {
  if (link?.status === "paid")
    return {
      title: "This fee is paid",
      text: `Thanks. You can book with ${link.stylist_name} again.`,
      linkLabel: `Book with ${link.stylist_name}`,
      linkHref: `/${link.stylist_slug}`,
    };

  if (link?.status === "expired")
    return {
      title: "This link has expired",
      text: "Reply to the email we sent you and we’ll send a new one.",
      linkLabel: "Go to Tiwára’s House",
      linkHref: "/",
    };

  if (link?.status === "cancelled")
    return {
      title: "Nothing to pay",
      text: "This fee was waived or paid another way.",
      linkLabel: "Go to Tiwára’s House",
      linkHref: "/",
    };

  return {
    title: "This link isn’t valid",
    text: "Use the link in the latest email we sent you.",
    linkLabel: "Go to Tiwára’s House",
    linkHref: "/",
  };
};

export const LINK_PAY_ERRORS: Record<string, string> = {
  link_paid: "This fee is already paid.",
  link_expired: "This link has expired. Reply to our email for a new one.",
  link_not_valid:
    "This link no longer works. Use the link in our latest email.",
  turnstile_failed: "We couldn't check this browser. Try again.",
  rate_limited: "Too many tries. Wait a few minutes, then try again.",
};
