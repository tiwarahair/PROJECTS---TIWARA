import { formatMoney, roundToPence } from "../../../../utils/money";
import { parseAmountLabel } from "../format";
import type {
  ConfirmDialog,
  PastRecord,
  StudioClient,
  StudioState,
} from "../types";

export const getProtectionNoun = ({ policy }: StudioState): string => {
  if (policy.mode === "deposit") return `${policy.deposit}% deposit`;

  if (policy.mode === "card") return "card on file";

  return policy.mode === "full" ? "full payment" : "";
};

const getProtectionAmount = (
  { policy }: StudioState,
  price: number,
): number => {
  if (policy.mode === "deposit")
    return Math.round(price * policy.deposit) / 100;

  return policy.mode === "full" ? price : 0;
};

const getBookingFee = (amount: number): number =>
  amount > 0 ? Math.round((amount * 0.015 + 0.5) * 100) / 100 : 0;

export const getProtectionTotal = (
  state: StudioState,
  price: number,
): number => {
  const amount = getProtectionAmount(state, price);

  return Math.round((amount + getBookingFee(amount)) * 100) / 100;
};

/** Link expiry: 48 hours from sending, or 2 hours before the start, whichever is first. */
export const getProtectionExpiry = (
  from: number,
  offset: number | null,
  time: string | null,
): number => {
  const base = (from || Date.now()) + 48 * 3600 * 1000;

  if (offset == null || !time) return base;

  const date = new Date();

  date.setDate(date.getDate() + offset);
  const parts = String(time).split(":");

  date.setHours(
    parseInt(parts[0] ?? "", 10) || 0,
    parseInt(parts[1] ?? "", 10) || 0,
    0,
    0,
  );

  return Math.min(base, date.getTime() - 2 * 3600 * 1000);
};

interface PolicyFee {
  amount: number;
  label?: string;
  subtitle?: string;
  refund: string;
}

/** Late-cancellation ("late") or no-show ("noShow") charge from the saved payment policy. */
export const getPolicyFee = (
  state: StudioState,
  kind: "late" | "noShow",
  booking: { price: number },
): PolicyFee => {
  const policy = state.policy;
  const mode = policy.mode || "none";
  const price = +booking.price || 0;
  const fee = policy[kind];

  const deposit = roundToPence((price * (policy.deposit || 0)) / 100);

  const getRefund = () => {
    if (mode === "deposit") return "Deposit refunded";

    return mode === "full" ? "Refunded in full" : "Nothing charged";
  };

  const refund = getRefund();

  if (mode === "none") return { amount: 0, refund };

  const getBaseAmount = () => {
    if (!fee.on) return 0;

    if (mode === "deposit" && fee.kind === "keep") return deposit;

    return roundToPence((price * (fee.percent || 0)) / 100);
  };

  let amount = getBaseAmount();

  if (mode === "deposit" && !policy.refundable)
    amount = Math.max(amount, deposit);

  if (mode === "full") amount = Math.min(amount, price);

  if (amount <= 0) return { amount: 0, refund };

  const getSubtitle = () => {
    if (mode === "deposit") {
      if (Math.abs(amount - deposit) < 0.005)
        return `${formatMoney(deposit)} deposit kept`;

      if (amount < deposit) {
        const refunded = formatMoney(deposit - amount);

        return `${formatMoney(amount)} kept from the deposit, ${refunded} refunded`;
      }

      const charged = formatMoney(amount - deposit);

      return `${formatMoney(deposit)} deposit kept and ${charged} charged to the card on file`;
    }

    if (mode === "full")
      return amount >= price
        ? `${formatMoney(price)} kept, no refund`
        : `${formatMoney(amount)} kept, ${formatMoney(price - amount)} refunded`;

    return `${formatMoney(amount)} charged to the card on file`;
  };

  const subtitle = getSubtitle();

  return { amount, label: formatMoney(amount), subtitle, refund };
};

export const getWaiveConfirm = (
  state: StudioState,
  row: PastRecord,
  client: StudioClient | null,
  isFresh: boolean,
  run: () => void,
): ConfirmDialog => {
  const policy = state.policy;
  const first = (client?.name || "the client").split(" ")[0];

  const fee = parseAmountLabel(row.feeLabel);

  const deposit = Math.round(row.price * (policy.deposit || 0)) / 100;

  if (!isFresh)
    return {
      title: `Refund ${formatMoney(fee)} to ${first}’s card ending 4242?`,
      body: "It usually takes 5–10 business days to arrive. The card fee isn’t returned.",
      yesLabel: `Refund ${formatMoney(fee)}`,
      yes: run,
    };

  const mode = policy.mode;

  const getBody = () => {
    if (mode === "deposit")
      return policy.refundable
        ? `Her ${formatMoney(deposit)} deposit will be refunded and she won’t be charged anything else.`
        : `She won’t be charged the extra ${formatMoney(Math.max(0, fee - deposit))}. Her ${formatMoney(deposit)} deposit is non-refundable and will be kept.`;

    if (mode === "full")
      return `The ${formatMoney(fee)} will be refunded to her card.`;

    return "She won’t be charged.";
  };

  const body = getBody();

  return {
    title: `Waive ${first}’s ${formatMoney(fee)} fee?`,
    body: `${body} The booking fee isn’t refunded.`,
    yesLabel: "Waive fee",
    yes: run,
  };
};
