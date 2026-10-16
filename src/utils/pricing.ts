// Booking fee and the client-facing policy lines.
// policyLines is the ONE client-facing builder (Studio preview and Booking Review/Pay/Confirmation).
import { Calendar, Clock, CreditCard, UserX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Policy, PolicyFee, PolicyMode } from "../types/policy";
import { formatMoney, roundToPence } from "./money";

/** Client booking fee: £0.50 + 1.5%, rounded to the penny. */
export const bookingFee = (price: number): number =>
  roundToPence(0.5 + 0.015 * price);

/** "48 hours", "1 hour", "30 minutes" */
export const getWindowText = (hours: number): string => {
  if (hours < 1) return "30 minutes";

  return hours === 1 ? "1 hour" : `${hours} hours`;
};

interface PolicyLine {
  icon: LucideIcon;
  text: string;
}

export interface PolicySummary {
  dueToday: number;
  lines: PolicyLine[];
  fee: number;
  deposit: number;
  balance: number;
  price: number;
  mode: PolicyMode;
  cardSaved: boolean;
  notes: string[];
}

export const policyLines = (
  policy: Policy,
  price: number,
  stylistName: string,
): PolicySummary => {
  const {
    mode,
    depositPercent,
    refundable,
    freeWindowHours,
    late,
    noShow,
    graceMinutes,
    extras,
  } = policy;

  const fee = bookingFee(price);
  const lines: PolicyLine[] = [];
  const addLine = (icon: LucideIcon, text: string) =>
    lines.push({ icon, text });

  const deposit =
    mode === "deposit" ? roundToPence((price * depositPercent) / 100) : 0;

  const windowText = getWindowText(freeWindowHours);
  let dueToday = fee;
  let balance = price;

  if (mode === "deposit") {
    dueToday = roundToPence(deposit + fee);
    balance = roundToPence(price - deposit);

    addLine(
      CreditCard,
      `Pay ${formatMoney(dueToday)} today (${formatMoney(deposit)} deposit + ${formatMoney(fee)} booking fee). The ${formatMoney(balance)} balance is paid to ${stylistName} at your appointment.`,
    );
  }

  if (mode === "full") {
    dueToday = roundToPence(price + fee);
    balance = 0;

    addLine(
      CreditCard,
      `Pay ${formatMoney(dueToday)} today (${formatMoney(price)} + ${formatMoney(fee)} booking fee). Nothing more to pay at your appointment.`,
    );
  }

  if (mode === "card")
    addLine(
      CreditCard,
      `Pay ${formatMoney(fee)} booking fee today. Your card is saved and the ${formatMoney(price)} is paid to ${stylistName} at your appointment.`,
    );

  if (mode === "none")
    addLine(
      CreditCard,
      `Pay ${formatMoney(fee)} booking fee today. The ${formatMoney(price)} is paid to ${stylistName} at your appointment.`,
    );

  const getCancellationText = (): string => {
    if (mode === "deposit")
      return refundable
        ? `Free cancellation up to ${windowText} before; your deposit is refunded.`
        : `Cancel or reschedule up to ${windowText} before at no additional charge. Your ${formatMoney(deposit)} deposit is non-refundable.`;

    if (mode === "full")
      return `Free cancellation up to ${windowText} before; you’re refunded in full.`;

    if (mode === "card") return `Free cancellation up to ${windowText} before.`;

    return `Please cancel or reschedule at least ${windowText} before.`;
  };

  addLine(Calendar, getCancellationText());

  const getFeeLine = (
    { kind, percent }: PolicyFee,
    baseLabel: string,
    short = false,
  ): string => {
    const amount =
      mode === "deposit" && kind === "keep"
        ? deposit
        : roundToPence((price * percent) / 100);

    const shownPercent =
      mode === "deposit" &&
      (kind === "keep" || (!refundable && amount < deposit))
        ? depositPercent
        : Math.min(percent, 100);

    const label = `${baseLabel} (${shownPercent}%)`;

    if (mode === "deposit") {
      if (
        kind === "keep" ||
        Math.abs(amount - deposit) < 0.005 ||
        (!refundable && amount < deposit)
      )
        return `${label}: ${formatMoney(deposit)} (your deposit is kept).`;

      if (amount > deposit)
        return short
          ? `${label}: ${formatMoney(amount)}.`
          : `${label}: ${formatMoney(amount)} (your deposit is kept and ${formatMoney(amount - deposit)} charged to your card).`;

      return `${label}: ${formatMoney(amount)} (kept from your deposit, ${formatMoney(deposit - amount)} refunded).`;
    }

    if (mode === "full")
      return amount >= price
        ? `${label}: ${formatMoney(price)} kept, no refund.`
        : `${label}: ${formatMoney(amount)} kept, rest refunded.`;

    return `${label}: ${formatMoney(amount)} charged to your card.`;
  };

  const arriveText = graceMinutes
    ? `Please arrive within ${graceMinutes} minutes.`
    : "Please arrive on time.";

  if (mode !== "none" && late.on)
    addLine(Clock, getFeeLine(late, "Late cancellation"));

  if (mode !== "none" && noShow.on) {
    const noShowLine = getFeeLine(noShow, "No-show", true);

    const noShowArrive = graceMinutes
      ? `Please arrive within ${graceMinutes} minutes, as after that ${stylistName} may mark it as a no-show.`
      : arriveText;

    addLine(UserX, `${noShowLine} ${noShowArrive}`);
  } else addLine(Clock, arriveText);

  return {
    dueToday,
    lines,
    fee,
    deposit,
    balance,
    price,
    mode,
    cardSaved: mode === "deposit" || mode === "card",
    notes: (extras ?? [])
      .filter((extra) => extra?.text?.trim())
      .map(({ text }) => text.trim()),
  };
};
