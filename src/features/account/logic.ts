// Account derived values: dates, address line, booking money and receipts, .ics and download.
import type { SavedAddress } from "../../types/address";
import { getAddressOneLine } from "../../utils/address";
import type { AccountBooking, Profile } from "./data";
import { formatPence } from "../../utils/money";
import { formatWeekdayDate, formatClockTime } from "../../utils/dates";
import { getCalendarFile } from "../../../supabase/functions/_shared/calendar-file";
import { escapeHtml } from "../../../supabase/functions/_shared/escape-html";

/** "Wed 14 Oct" or "Wed 14 Oct, 10:30". */
export const formatAccountDate = (time: number, withTime = false): string => {
  const date = new Date(time);

  const day = formatWeekdayDate(date);

  return withTime ? `${day}, ${formatClockTime(date)}` : day;
};

export const getAddressLine = (address: SavedAddress | undefined): string =>
  address ? getAddressOneLine(address) : "";

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

type StatusTag = [label: string, background: string, colour: string];

export interface BookingMoney {
  whereShort: string;
  tag: StatusTag;
  paid: string;
  due: string;
  lines: ReceiptLine[];
  payments: { label: string; amount: string }[];
  total: string;
}

const STATUS_TAGS: Record<AccountBooking["status"], StatusTag> = {
  awaiting_confirmation: [
    "Awaiting confirmation",
    "rgba(181,84,31,.13)",
    "#7d3712",
  ],
  confirmed: ["Confirmed", "rgba(47,122,77,.12)", "#245c3b"],
  arrived: ["Confirmed", "rgba(47,122,77,.12)", "#245c3b"],
  completed: ["Completed", "var(--fill-quiet)", "var(--neutral-700,#3d3730)"],
  cancelled: ["Cancelled", "var(--fill-quiet)", "var(--neutral-600)"],
  auto_cancelled: ["Cancelled", "var(--fill-quiet)", "var(--neutral-600)"],
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

// the appointment never happened, so the client paid only what was kept
const CALLED_OFF_STATUSES: AccountBooking["status"][] = [
  "cancelled",
  "auto_cancelled",
  "no_show",
];

export const isUpcomingBooking = ({ status, at }: AccountBooking) =>
  at >= Date.now() && UPCOMING_STATUSES.includes(status);

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank transfer",
  other: "Paid to the stylist",
};

export const getBookingMoney = (booking: AccountBooking): BookingMoney => {
  const { status, service, customisation, pricePence, feePence, tipPence } =
    booking;

  const { payments, refunds, cardLabel } = booking;
  const tag = STATUS_TAGS[status];
  const refundedPence = sumPence(refunds);
  const netPence = sumPence(payments) - refundedPence;
  const isCalledOff = CALLED_OFF_STATUSES.includes(status);

  const lines = isCalledOff
    ? [{ label: service, subtitle: tag[0], pence: netPence }]
    : [
        { label: service, subtitle: customisation, pence: pricePence },
        { label: "Booking fee", subtitle: "", pence: feePence },
        { label: "Tip", subtitle: "", pence: tipPence },
      ].filter(({ pence }, index) => index === 0 || pence > 0);

  const totalPence = isCalledOff ? netPence : pricePence + feePence + tipPence;
  const duePence = totalPence - netPence;

  const getMethod = (method: string) =>
    method === "card" ? (cardLabel ?? "Card") : METHOD_LABELS[method];

  return {
    whereShort: booking.isMobile ? "At your address" : booking.stylistArea,
    tag,
    paid: [
      netPence > 0 && `${formatPence(netPence, { pence: "auto" })} paid`,
      refundedPence > 0 &&
        `${formatPence(refundedPence, { pence: "auto" })} refunded`,
    ]
      .filter(Boolean)
      .join(" · "),
    due:
      isUpcomingBooking(booking) && duePence > 0
        ? ` · ${formatPence(duePence, { pence: "auto" })} to pay at your appointment`
        : "",
    lines: lines.map(({ label, subtitle, pence }) => ({
      label,
      subtitle,
      amount: formatPence(pence, { pence: "auto" }),
    })),
    payments: [
      ...payments.map(({ kind, method, amountPence, paidAt }) => ({
        label: [
          `${kind === "fee" ? "Fee charged" : "Paid"} ${formatAccountDate(paidAt)}`,
          getMethod(method),
        ]
          .filter(Boolean)
          .join(" · "),
        amount: formatPence(amountPence, { pence: "auto" }),
      })),
      ...refunds.map(({ amountPence, refundedAt }) => ({
        label: `Refunded ${formatAccountDate(refundedAt)}`,
        amount: `−${formatPence(amountPence, { pence: "auto" })}`,
      })),
    ],
    total: formatPence(totalPence, { pence: "auto" }),
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
  { ref, date, stylist, where, total, lines, payments }: ReceiptView,
  { first, last }: Profile,
): string => {
  const rows = [
    ...lines.map(({ label, subtitle, amount }) => {
      const subtitleLine = subtitle
        ? `<br><small>${escapeHtml(subtitle)}</small>`
        : "";

      return `<tr><td>${escapeHtml(label)}${subtitleLine}</td><td align="right">${amount}</td></tr>`;
    }),
    ...payments.map(
      ({ label, amount }) =>
        `<tr><td><small>${escapeHtml(label)}</small></td><td align="right"><small>${amount}</small></td></tr>`,
    ),
  ].join("");

  const details = [
    `${ref} · ${date}`,
    stylist,
    where,
    `Billed to ${first} ${last}`,
  ]
    .map(escapeHtml)
    .join("<br>");

  return `<!doctype html><meta charset="utf-8"><title>Receipt ${escapeHtml(ref)}</title><body style="font-family:sans-serif;max-width:480px;margin:40px auto;color:#1a1714"><h1>Tiwára’s House receipt</h1><p>${details}</p><table width="100%" cellpadding="8">${rows}<tr><th align="left">Total</th><th align="right">${total}</th></tr></table></body>`;
};
