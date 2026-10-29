import { renderNotice } from "../_shared/email-layout.ts";
import type { RenderedEmail } from "../_shared/email-layout.ts";
import { formatWhen, getLinkWording } from "./booking-emails.ts";
import { pounds } from "../_shared/money.ts";
import type { BookingDetails } from "./booking-emails.ts";

interface ReceiptLine {
  name: string;
  base_pence: number;
  adjustment_pence: number;
  reason: string;
}

interface ReceiptPayment {
  kind: "booking" | "balance";
  method: string;
  amount_pence: number;
  tip_pence: number;
}

export interface Receipt extends BookingDetails {
  lines: ReceiptLine[] | null;
  final_pence: number;
  tip_pence: number;
  payments: ReceiptPayment[];
  refunded_pence: number;
  given_back_pence?: number;
  given_back_via?: string | null;
  corrected?: boolean;
}

export interface BalanceDue extends Receipt {
  amount_pence: number;
  expires_at: string;
  pay_url: string;
  is_reminder?: boolean;
}

const METHODS: Record<string, string> = {
  card: "card",
  cash: "cash",
  bank: "bank transfer",
  reader: "card in the salon",
  other: "another way",
};

const getLines = ({ lines, service_name: service, final_pence: final }: Receipt) =>
  (lines?.length ? lines : [{ name: service, base_pence: final, adjustment_pence: 0, reason: "" }]).map(
    ({ name, base_pence: base, adjustment_pence: adjustment, reason }) =>
      `${name}: ${pounds(base + adjustment)}${adjustment ? ` (${reason})` : ""}`,
  );

const getPayments = ({ payments }: Receipt) =>
  payments.map(({ kind, method, amount_pence: amount }) =>
    kind === "booking"
      ? `Paid when you booked: ${pounds(amount)}`
      : `Paid by ${METHODS[method] ?? "card"}: ${pounds(amount)}`,
  );

const getSummary = (receipt: Receipt) => [
  ...getLines(receipt),
  `Total: ${pounds(receipt.final_pence)}`,
  ...(receipt.tip_pence ? [`Tip: ${pounds(receipt.tip_pence)}`] : []),
  ...getPayments(receipt),
  ...(receipt.refunded_pence
    ? [`Refunded to your card: ${pounds(receipt.refunded_pence)}. It can take 5–10 working days to show.`]
    : []),
  ...(receipt.given_back_pence
    ? [`Given back by ${METHODS[receipt.given_back_via ?? ""] ?? "another way"}: ${pounds(receipt.given_back_pence)}`]
    : []),
];

export const checkoutReceipt = (receipt: Receipt): RenderedEmail =>
  renderNotice({
    title: `${receipt.corrected ? "Corrected receipt" : "Your receipt"}: ${receipt.service_name}`,
    paragraphs: [
      `${receipt.service_name} with ${receipt.stylist_name} on ${formatWhen(receipt.starts_at)} (UK time).`,
      ...getSummary(receipt),
      `Booking reference: ${receipt.ref}`,
    ],
    footnote: "Questions about this receipt? Reply to this email.",
  });

export const balanceDue = (balance: BalanceDue): RenderedEmail => {
  const { title, expiry } = getLinkWording(
    `Pay ${pounds(balance.amount_pence)} to ${balance.stylist_name}`,
    balance.expires_at,
    balance.is_reminder,
  );

  return renderNotice({
    title,
    paragraphs: [
      `Thanks for visiting ${balance.stylist_name} for ${balance.service_name} on ${formatWhen(balance.starts_at)} (UK time).`,
      ...getSummary(balance),
      `${pounds(balance.amount_pence)} is left to pay. You can use any card.`,
      `Booking reference: ${balance.ref}`,
    ],
    button: { label: `Pay ${pounds(balance.amount_pence)}`, url: balance.pay_url },
    footnote: `${expiry} Questions? Reply to this email.`,
  });
};
