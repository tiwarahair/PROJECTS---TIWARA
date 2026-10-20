// A completed booking's checkout from the database → what Past shows and acts on.
import type { StudioBookingRow } from "../../../lib/studio-api/bookings";
import type { CheckoutRecord, PastRecord } from "../core/types";
import { getCheckoutLabel } from "./checkout-label";
import { toPounds } from "./fee-records";
import { getNumber, getText, isRecord } from "./row-values";

type PaymentRow = StudioBookingRow["payments"][number];

const sumPence = (values: number[]) => {
  let total = 0;

  for (const value of values) total += value;

  return total;
};

const toLine = (line: unknown) => ({
  name: getText(line, "name"),
  subtitle: getText(line, "subtitle"),
  base: toPounds(getNumber(line, "base_pence")),
  adjustment: toPounds(getNumber(line, "adjustment_pence")),
  reason: getText(line, "reason"),
});

const byTime = (
  first: { created_at: string },
  second: { created_at: string },
) => Date.parse(first.created_at) - Date.parse(second.created_at);

const getBalancePayments = ({ payments }: StudioBookingRow) =>
  payments.filter(({ kind }) => kind === "balance").sort(byTime);

// a cancelled link can sit beside a newer one: the one still out, else the latest
const getBalanceLink = ({ payment_links: links }: StudioBookingRow) => {
  const balance = links
    .filter(({ purpose }) => purpose === "balance")
    .sort(byTime);

  return (
    balance.find(
      ({ status }) => status === "pending" || status === "expired",
    ) ?? balance.at(-1)
  );
};

/** What the client paid towards the price when they booked. */
export const getPaidAtBooking = ({ payments }: StudioBookingRow) =>
  sumPence(
    payments
      .filter(({ kind }) => kind === "booking")
      .map(({ amount_pence: amount, platform_fee_pence: fee }) => amount - fee),
  );

const getRecordedPayment = (payment: PaymentRow | undefined) =>
  payment && payment.method !== "card"
    ? {
        recordedPayment: {
          id: payment.id,
          amount: toPounds(payment.amount_pence),
          tip: toPounds(payment.tip_pence),
          via: payment.method,
          takenAt: Date.parse(payment.created_at),
        },
      }
    : {};

export const getCheckoutFields = (
  row: StudioBookingRow,
): Partial<PastRecord> => {
  if (row.status !== "completed") return {};

  const method = getText(row.checkout, "method") || "none";
  const balance = getBalancePayments(row);
  const link = getBalanceLink(row);
  const isLinkPaid = method === "link" && balance.length > 0;

  const lowered = row.refunds.filter(
    ({ reason }) => reason === "price_lowered",
  );

  const lines =
    isRecord(row.checkout) && Array.isArray(row.checkout.lines)
      ? row.checkout.lines
      : [];

  const checkout: CheckoutRecord = {
    method,
    via: getText(row.checkout, "via"),
    charged: toPounds(
      method === "link"
        ? (link?.amount_pence ?? 0)
        : sumPence(balance.map(({ amount_pence: amount }) => amount)),
    ),
    tip: toPounds(row.tip_pence),
    refundAuto: toPounds(
      sumPence(lowered.map(({ amount_pence: amount }) => amount)),
    ),
    total: toPounds(row.final_price_pence ?? row.price_pence),
    lines: lines.length
      ? lines.map(toLine)
      : [
          {
            name: getText(row.snapshot, "service_name"),
            subtitle: "",
            base: toPounds(row.final_price_pence ?? row.price_pence),
            adjustment: 0,
            reason: "",
          },
        ],
    mode: getText(row.terms, "mode") || "none",
    paid: toPounds(getPaidAtBooking(row)),
  };

  return {
    checkout,
    ...(row.card_label ? { cardLabel: row.card_label } : {}),
    price: checkout.total,
    meta: getCheckoutLabel(checkout, {
      isPaid: isLinkPaid,
      isExpired: link?.status === "expired",
    }),
    ...(isLinkPaid
      ? {
          linkPaid: true,
          linkVia: balance[0]?.method === "card" ? "link" : balance[0]?.method,
        }
      : {}),
    refunded: toPounds(
      sumPence(
        row.refunds
          .filter(({ reason }) => reason !== "price_lowered")
          .map(({ amount_pence: amount }) => amount),
      ),
    ),
    ...getRecordedPayment(balance.at(-1)),
  };
};
