import type { PaymentLink } from "../../lib/payment-link-api";
import { formatMoney } from "../../utils/money";

const FEE_NAMES = {
  late_cancel: "Late cancellation fee",
  no_show: "No-show fee",
  balance: "Balance",
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

export const isBalance = (link: PaymentLink | undefined) =>
  link?.kind === "balance";

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
  if (link?.status === "paid" && isBalance(link))
    return {
      title: "This is paid",
      text: `Thanks for visiting ${link.stylist_name}. We’ve emailed you a receipt.`,
      linkLabel: `Book with ${link.stylist_name}`,
      linkHref: `/${link.stylist_slug}`,
    };

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
      text: "Contact us and we’ll send a new one.",
      linkLabel: "Contact us",
      linkHref: "/help",
    };

  if (link?.status === "cancelled")
    return {
      title: "Nothing to pay",
      text: isBalance(link)
        ? "This was paid another way."
        : "This fee was waived or paid another way.",
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
  link_paid: "This is already paid.",
  link_processing: "Your payment is being confirmed. Check back in a minute.",
  link_expired: "This link has expired. Contact us for a new one.",
  link_not_valid:
    "This link no longer works. Use the link in our latest email.",
  turnstile_failed: "We couldn't check this browser. Try again.",
  rate_limited: "Too many tries. Wait a few minutes, then try again.",
};
