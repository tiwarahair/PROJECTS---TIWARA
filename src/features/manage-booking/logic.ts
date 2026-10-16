import type {
  CancellationTerms,
  ManagedBooking,
} from "../../lib/manage-booking-api";
import { formatMoney } from "../../utils/money";

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

export const getCancelLines = (
  booking: ManagedBooking,
  {
    is_late: isLate,
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
          isWholeDeposit
            ? `Your ${toPounds(refund)} deposit is refunded to your card.`
            : `${toPounds(refund)} is refunded to your card.`,
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
