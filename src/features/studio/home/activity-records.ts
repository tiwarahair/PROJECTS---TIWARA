import type { ActivityRow } from "../../../lib/studio-api/home";
import { getTimeAgo } from "../../../utils/dates";
import { formatMoney } from "../../../utils/money";
import type { StudioNotification } from "../core/types";

const getWording = ({
  kind,
  client_first: first,
  service,
  amount_pence: pence,
}: ActivityRow): [string, string] | null => {
  const client = first || "A client";
  const what = service || "their appointment";
  const amount = pence ? formatMoney(pence / 100, { pence: "always" }) : "";

  switch (kind) {
    case "new_booking":
      return ["New booking", `${client} booked ${what}.`];
    case "client_confirmed":
      return ["Booking confirmed", `${client} confirmed ${what}.`];
    case "client_cancelled":
      return ["Booking cancelled", `${client} cancelled ${what}.`];
    case "client_rescheduled":
      return ["Booking moved", `${client} moved ${what} to a new time.`];
    case "auto_cancelled":
      return [
        "Auto-cancelled",
        `${client} didn’t confirm ${what} in time, so it was cancelled.`,
      ];
    case "fee_paid":
      return [
        "Fee charged",
        `${amount || "The fee"} was charged to ${client}’s card.`,
      ];
    case "fee_unpaid":
      return [
        "Fee declined",
        `${client}’s card was declined for the fee. They’ve been sent a payment link.`,
      ];
    case "fee_paid_by_link":
      return ["Fee paid", `${client} paid ${amount || "the fee"} by link.`];
    case "balance_paid_by_link":
      return [
        "Balance paid",
        `${client} paid ${amount || "the balance"} by link.`,
      ];
    case "dispute_opened":
      return [
        "Payment disputed",
        `${client} disputed a ${amount} payment. Respond in Earnings.`,
      ];
    case "payout_paid":
      return ["Payout sent", `${amount} has been paid to your bank.`];
    case "review_received":
      return ["New review", `${client} reviewed ${what}.`];
    case "review_kept":
      return ["Review kept", `We checked ${client}’s review: it stays up.`];
    case "review_text_removed":
      return [
        "Review words removed",
        `We removed the words of ${client}’s review. The stars still count.`,
      ];
    case "review_removed":
      return ["Review removed", `We removed ${client}’s review.`];
    case "appeal_kept":
      return [
        "Appeal answered",
        `We looked again at ${client}’s review and kept our decision.`,
      ];
    case "appeal_changed":
      return [
        "Appeal answered",
        `We looked again at ${client}’s review and changed our decision.`,
      ];
    case "payout_failed":
      return [
        "Payout failed",
        `Your ${amount} payout couldn’t be sent. Update your bank details in Earnings.`,
      ];
    default:
      return null;
  }
};

const OPENS_EARNINGS = ["dispute_opened", "payout_paid", "payout_failed"];

const getTarget = (kind: string, bookingId: string | null) => {
  if (OPENS_EARNINGS.includes(kind)) return { opensEarnings: true };

  if (kind.startsWith("review_") || kind.startsWith("appeal_"))
    return { opensReviews: true };

  return bookingId ? { bookingId } : {};
};

export const toNotification = (
  row: ActivityRow,
  now = new Date(),
): StudioNotification | null => {
  const wording = getWording(row);

  if (!wording) return null;

  const [title, body] = wording;
  const { id, kind, at, booking_id: bookingId, is_unread: unread } = row;

  return {
    id,
    at,
    title,
    body,
    time: getTimeAgo(new Date(at), now),
    unread,
    ...getTarget(kind, bookingId),
  };
};

// worked out when shown, so "Just now" moves on even when nothing new arrives
export const getNotificationTime = ({
  at,
  time,
}: Pick<StudioNotification, "at" | "time">) =>
  at ? getTimeAgo(new Date(at)) : time;
