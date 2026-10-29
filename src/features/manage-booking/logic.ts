import type {
  CancellationTerms,
  ManagedBooking,
} from "../../lib/manage-booking-api";
import { formatMoney } from "../../utils/money";
import { getWindowText } from "../../utils/pricing";

const londonParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const getParts = (iso: string) =>
  Object.fromEntries(
    londonParts
      .formatToParts(new Date(iso))
      .map(({ type, value }) => [type, value]),
  );

export const isCancelledStatus = (status: string) =>
  status === "cancelled" || status === "auto_cancelled";

export const formatWhen = (iso: string) => {
  const { weekday, day, month, hour, minute } = getParts(iso);

  return `${weekday} ${day} ${month}, ${hour}:${minute}`;
};

export const toPounds = (pence: number) =>
  formatMoney(pence / 100, { pence: "always" });

export const getOptionsLine = ({ snapshot }: ManagedBooking) =>
  [
    ...snapshot.options.map(({ label }) => label),
    snapshot.colour,
    ...snapshot.addons.map(({ name }) => name),
  ]
    .filter(Boolean)
    .join(" · ");

// with no booking policy the only thing lost after the free window is the booking fee
const hasPolicy = ({ terms }: ManagedBooking) =>
  (terms.mode ?? "none") !== "none";

export const getTermsLine = (booking: ManagedBooking) => {
  const { cancellation } = booking;

  if (!cancellation.is_late)
    return `Free cancellation until ${formatWhen(cancellation.free_cancel_until)}`;

  return hasPolicy(booking)
    ? "The free cancellation time has passed, so late cancellation terms apply."
    : "The free cancellation time has passed, so the booking fee isn’t refunded.";
};

export const getRescheduleNote = (booking: ManagedBooking) => {
  if (booking.reschedule_count > 0)
    return "You've already used your 1 free reschedule.";

  return hasPolicy(booking)
    ? "You can't reschedule after the free cancellation time."
    : "";
};

/**
 * EDGE CASE: a user trying to reschedule a booking that is close to the start time e.g. selecting a booking for the next day (so it's already within the cancellation window - free cancellation is gone)
 * so we're telling them => free cancellation doesnt apply if you reschedule to this time
 */
export const getLateRescheduleWarning = (
  booking: ManagedBooking,
  startsAt: string,
  now = Date.now(),
) => {
  const hours = booking.terms.free_window_hours;

  if (Date.parse(startsAt) - hours * 3_600_000 > now) return null;

  if (!hasPolicy(booking))
    return `This time is within ${getWindowText(hours)}, so the booking fee won’t be refunded if you cancel.`;

  return `This time is within ${getWindowText(hours)}, so free cancellation won’t apply and you can’t reschedule again.`;
};

const getKeptLine = (
  { terms, stylist_name: stylist }: ManagedBooking,
  kept: number,
) => {
  if (terms.mode !== "deposit")
    return `${toPounds(kept)} is kept under ${stylist}'s policy.`;

  return kept === terms.deposit_pence
    ? `Your ${toPounds(kept)} deposit is kept under ${stylist}'s policy.`
    : `${toPounds(kept)} of your deposit is kept under ${stylist}'s policy.`;
};

/** with a late fee, the refund waits for the fee to settle a day later. */
export const getRefundTiming = (fee = 0) =>
  fee
    ? "comes back to your card when the fee settles, 24 hours after you cancel."
    : "is refunded to your card.";

const getRefundLine = (
  { terms }: ManagedBooking,
  refund: number,
  feeRefund: number,
  fee: number,
) => {
  if (feeRefund)
    return `${toPounds(refund)} is refunded to your card, including the ${toPounds(feeRefund)} booking fee.`;

  const isWholeDeposit =
    terms.mode === "deposit" && refund === terms.deposit_pence;

  return `${isWholeDeposit ? `Your ${toPounds(refund)} deposit` : toPounds(refund)} ${getRefundTiming(fee)}`;
};

export const getCancelLines = (
  booking: ManagedBooking,
  {
    is_late: isLate,
    fee_pence: fee = 0,
    refund_pence: refund,
    fee_refund_pence: feeRefund = 0,
    kept_pence: kept,
    charge_pence: charge,
  }: CancellationTerms,
) => {
  const { stylist_name: stylist } = booking;

  return [
    ...(isLate ? ["It's past the free cancellation time."] : []),
    ...(refund ? [getRefundLine(booking, refund, feeRefund, fee)] : []),
    ...(kept ? [getKeptLine(booking, kept)] : []),
    ...(charge
      ? [
          `A ${toPounds(charge)} late cancellation fee is due under ${stylist}'s policy.`,
        ]
      : []),
    ...(refund || kept || charge ? [] : ["Nothing more to pay."]),
  ];
};
