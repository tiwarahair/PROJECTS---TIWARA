// Account derived values: dates, address line, booking money and receipts, .ics and download.
import type { SavedAddress } from "../../types/address";
import { getAddressOneLine } from "../../utils/address";
import type { AccountBooking, Profile } from "./data";
import { formatMoney } from "../../utils/money";
import { formatWeekdayDate, formatClockTime } from "../../utils/dates";
import { getCalendarFile } from "../../../supabase/functions/_shared/calendar-file";

/** "Wed 14 Oct" or "Wed 14 Oct, 10:30". */
export const formatAccountDate = (time: number, withTime = false): string => {
  const date = new Date(time);

  const day = formatWeekdayDate(date);

  return withTime ? `${day}, ${formatClockTime(date)}` : day;
};

export const getAddressLine = (address: SavedAddress | undefined): string =>
  address ? getAddressOneLine(address) : "";

const formatPence = (pence: number) => formatMoney(pence / 100);

const sumPence = (items: { amountPence: number }[]) => {
  let total = 0;

  for (const { amountPence } of items) total += amountPence;

  return total;
};

interface ReceiptLine {
  label: string;
  subtitle: string;
  amount: string;
}

export interface BookingMoney {
  whereShort: string;
  tag: [string, string, string];
  paid: string;
  due: string;
  lines: ReceiptLine[];
  payments: { label: string; amount: string }[];
  total: string;
}

const CONFIRMED_TAG: [string, string, string] = [
  "Confirmed",
  "rgba(47,122,77,.12)",
  "#245c3b",
];

const CANCELLED_TAG: [string, string, string] = [
  "Cancelled",
  "var(--fill-quiet)",
  "var(--neutral-600)",
];

const STATUS_TAGS: Record<AccountBooking["status"], [string, string, string]> =
  {
    awaiting_confirmation: [
      "Awaiting confirmation",
      "rgba(181,84,31,.13)",
      "#7d3712",
    ],
    confirmed: CONFIRMED_TAG,
    arrived: CONFIRMED_TAG,
    completed: ["Completed", "var(--fill-quiet)", "var(--neutral-700,#3d3730)"],
    cancelled: CANCELLED_TAG,
    auto_cancelled: CANCELLED_TAG,
    no_show: [
      "No-show",
      "var(--accent-wash-strong,rgba(143,17,18,.10))",
      "var(--accent-700)",
    ],
  };

const UPCOMING_STATUSES: AccountBooking["status"][] = [
  "awaiting_confirmation",
  "confirmed",
  "arrived",
];

export const isUpcomingBooking = ({ status }: AccountBooking) =>
  UPCOMING_STATUSES.includes(status);

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank transfer",
  other: "Paid to the stylist",
};

export const getBookingMoney = (booking: AccountBooking): BookingMoney => {
  const { pricePence, feePence, tipPence, payments, refunds, cardLabel } =
    booking;

  const paidPence = sumPence(payments);
  const refundedPence = sumPence(refunds);
  const totalPence = pricePence + feePence + tipPence;
  const duePence = totalPence - paidPence;

  const getMethod = (method: string) =>
    method === "card" ? (cardLabel ?? "Card") : (METHOD_LABELS[method] ?? "");

  const paidParts = [
    paidPence - refundedPence > 0 &&
      `${formatPence(paidPence - refundedPence)} paid`,
    refundedPence > 0 && `${formatPence(refundedPence)} refunded`,
  ].filter(Boolean);

  const lines: ReceiptLine[] = [
    {
      label: booking.service,
      subtitle: booking.customisation,
      amount: formatPence(pricePence),
    },
  ];

  if (feePence)
    lines.push({
      label: "Booking fee",
      subtitle: "",
      amount: formatPence(feePence),
    });

  if (tipPence)
    lines.push({ label: "Tip", subtitle: "", amount: formatPence(tipPence) });

  return {
    whereShort: booking.isMobile ? "At your address" : booking.stylistArea,
    tag: STATUS_TAGS[booking.status],
    paid: paidParts.join(" · "),
    due:
      isUpcomingBooking(booking) && duePence > 0
        ? ` · ${formatPence(duePence)} to pay at your appointment`
        : "",
    lines,
    payments: [
      ...payments.map(({ kind, method, amountPence, paidAt }) => ({
        label: `${kind === "fee" ? "Fee charged" : "Paid"} ${formatAccountDate(paidAt)} · ${getMethod(method)}`,
        amount: formatPence(amountPence),
      })),
      ...refunds.map(({ amountPence, refundedAt }) => ({
        label: `Refunded ${formatAccountDate(refundedAt)}`,
        amount: `−${formatPence(amountPence)}`,
      })),
    ],
    total: formatPence(totalPence),
  };
};

export type EditKey = "name" | "email" | "mobile";

/** An .ics calendar event for the booking. */
export const getBookingCalendarFile = ({
  ref,
  service,
  stylistName,
  at,
  minutes,
  where,
}: AccountBooking) =>
  getCalendarFile({
    ref,
    title: `${service} with ${stylistName}`,
    startsAt: new Date(at).toISOString(),
    endsAt: new Date(at + minutes * 6e4).toISOString(),
    location: where,
    description: `Booking ${ref}`,
  });

interface ReceiptView {
  ref: string;
  date: string;
  stylist: string;
  where: string;
  total: string;
  lines: ReceiptLine[];
  payments: { label: string; amount: string }[];
}

export const getReceiptHtml = (
  receipt: ReceiptView,
  profile: Profile,
): string => {
  const rows =
    receipt.lines
      .map(({ label, subtitle, amount }) => {
        const subtitleLine = subtitle ? `<br><small>${subtitle}</small>` : "";

        return `<tr><td>${label}${subtitleLine}</td><td align="right">${amount}</td></tr>`;
      })
      .join("") +
    receipt.payments
      .map(
        ({ label, amount }) =>
          `<tr><td><small>${label}</small></td><td align="right"><small>${amount}</small></td></tr>`,
      )
      .join("");

  const { ref, date, stylist, where, total } = receipt;
  const { first, last } = profile;

  return `<!doctype html><meta charset="utf-8"><title>Receipt ${ref}</title><body style="font-family:sans-serif;max-width:480px;margin:40px auto;color:#1a1714"><h1>Tiwára’s House receipt</h1><p>${ref} · ${date}<br>${stylist}<br>${where}<br>Billed to ${first} ${last}</p><table width="100%" cellpadding="8">${rows}<tr><th align="left">Total</th><th align="right">${total}</th></tr></table></body>`;
};
