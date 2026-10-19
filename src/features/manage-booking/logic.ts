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

export const getTermsLine = ({ cancellation }: ManagedBooking) =>
  cancellation.is_late
    ? "The free cancellation time has passed, so late cancellation terms apply."
    : `Free cancellation until ${formatWhen(cancellation.free_cancel_until)}`;

export const getRescheduleNote = (booking: ManagedBooking) =>
  booking.reschedule_count > 0
    ? "You've already used your 1 free reschedule."
    : "You can't reschedule after the free cancellation time.";

/**
 * EDGE CASE: a user trying to reschedule a booking that is close to the start time e.g. selecting a booking for the next day (so it's already within the cancellation window - free cancellation is gone)
 * so we're telling them => free cancellation doesnt apply if you reschedule to this time
 */
export const getLateRescheduleWarning = (
  { terms }: ManagedBooking,
  startsAt: string,
  now = Date.now(),
) => {
  const hours = terms.free_window_hours;

  if (Date.parse(startsAt) - hours * 3_600_000 > now) return null;

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

export const getCancelLines = (
  booking: ManagedBooking,
  {
    is_late: isLate,
    fee_pence: fee = 0,
    refund_pence: refund,
    kept_pence: kept,
    charge_pence: charge,
  }: CancellationTerms,
) => {
  const { terms, stylist_name: stylist } = booking;

  const isWholeDeposit =
    terms.mode === "deposit" && refund === terms.deposit_pence;

  return [
    ...(isLate ? ["It's past the free cancellation time."] : []),
    ...(refund
      ? [
          `${isWholeDeposit ? `Your ${toPounds(refund)} deposit` : toPounds(refund)} ${getRefundTiming(fee)}`,
        ]
      : []),
    ...(kept ? [getKeptLine(booking, kept)] : []),
    ...(charge
      ? [
          `A ${toPounds(charge)} late cancellation fee is due under ${stylist}'s policy.`,
        ]
      : []),
    ...(refund || kept || charge ? [] : ["Nothing more to pay."]),
  ];
};
