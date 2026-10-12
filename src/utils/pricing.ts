// Booking fee, money formatting and the client-facing policy lines, ported from data.js.
// policyLines is the ONE client-facing builder (Studio preview and Booking Review/Pay/Confirmation).
import { policyIcons } from "../data";
import type { Policy, PolicyFee, PolicyMode } from "../types/policy";

export const roundPence = (amount: number): number =>
  Math.round(amount * 100) / 100;

/** Client booking fee: £0.50 + 1.5%, rounded to the penny. */
export const bookingFee = (price: number): number =>
  roundPence(0.5 + 0.015 * price);

/** "£45" for whole pounds, "£45.50" otherwise. */
export const money = (amount: number): string => {
  const amountText =
    Math.abs(amount - Math.round(amount)) < 0.005
      ? String(Math.round(amount))
      : amount.toFixed(2);

  return `£${amountText}`;
};

/** "48 hours", "1 hour", "30 minutes" */
export const getWindowText = (hours: number): string => {
  if (hours < 1) return "30 minutes";

  return hours === 1 ? "1 hour" : `${hours} hours`;
};

export interface PolicyLine {
  icon: string;
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
  const addLine = (icon: string, text: string) => lines.push({ icon, text });

  const deposit =
    mode === "deposit" ? roundPence((price * depositPercent) / 100) : 0;

  const windowText = getWindowText(freeWindowHours);
  let dueToday = fee;
  let balance = price;

  if (mode === "deposit") {
    dueToday = roundPence(deposit + fee);
    balance = roundPence(price - deposit);

    addLine(
      policyIcons.payment,
      `Pay ${money(dueToday)} today (${money(deposit)} deposit + ${money(fee)} booking fee). The ${money(balance)} balance is paid to ${stylistName} at your appointment.`,
    );
  }

  if (mode === "full") {
    dueToday = roundPence(price + fee);
    balance = 0;

    addLine(
      policyIcons.payment,
      `Pay ${money(dueToday)} today (${money(price)} + ${money(fee)} booking fee). Nothing more to pay at your appointment.`,
    );
  }

  if (mode === "card")
    addLine(
      policyIcons.payment,
      `Pay ${money(fee)} booking fee today. Your card is saved and the ${money(price)} is paid to ${stylistName} at your appointment.`,
    );

  if (mode === "none")
    addLine(
      policyIcons.payment,
      `Pay ${money(fee)} booking fee today. The ${money(price)} is paid to ${stylistName} at your appointment.`,
    );

  const getCancellationText = (): string => {
    if (mode === "deposit")
      return refundable
        ? `Free cancellation up to ${windowText} before; your deposit is refunded.`
        : `Cancel or reschedule up to ${windowText} before at no additional charge. Your ${money(deposit)} deposit is non-refundable.`;

    if (mode === "full")
      return `Free cancellation up to ${windowText} before; you’re refunded in full.`;

    if (mode === "card") return `Free cancellation up to ${windowText} before.`;

    return `Please cancel or reschedule at least ${windowText} before.`;
  };

  addLine(policyIcons.calendar, getCancellationText());

  const getFeeLine = (
    { kind, percent }: PolicyFee,
    baseLabel: string,
    short = false,
  ): string => {
    const amount =
      mode === "deposit" && kind === "keep"
        ? deposit
        : roundPence((price * percent) / 100);

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
        return `${label}: ${money(deposit)} (your deposit is kept).`;

      if (amount > deposit)
        return short
          ? `${label}: ${money(amount)}.`
          : `${label}: ${money(amount)} (your deposit is kept and ${money(amount - deposit)} charged to your card).`;

      return `${label}: ${money(amount)} (kept from your deposit, ${money(deposit - amount)} refunded).`;
    }

    if (mode === "full")
      return amount >= price
        ? `${label}: ${money(price)} kept, no refund.`
        : `${label}: ${money(amount)} kept, rest refunded.`;

    return `${label}: ${money(amount)} charged to your card.`;
  };

  const arriveText = graceMinutes
    ? `Please arrive within ${graceMinutes} minutes.`
    : "Please arrive on time.";

  if (mode !== "none" && late.on)
    addLine(policyIcons.late, getFeeLine(late, "Late cancellation"));

  if (mode !== "none" && noShow.on) {
    const noShowLine = getFeeLine(noShow, "No-show", true);

    const noShowArrive = graceMinutes
      ? `Please arrive within ${graceMinutes} minutes, as after that ${stylistName} may mark it as a no-show.`
      : arriveText;

    addLine(policyIcons.noShow, `${noShowLine} ${noShowArrive}`);
  } else addLine(policyIcons.late, arriveText);

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
