// CheckoutSheet derived values shared by every view.
import { getRefundCap } from "./logic";
import type {
  CheckoutLine,
  CheckoutMoney,
  CheckoutView,
  PayMethod,
} from "./data";
import type { CheckoutController } from "./use-checkout";
import { formatMoney } from "../../utils/money";

export interface DetailRow {
  key: string;
  label: string;
  subtitle: string;
  value: string;
  isAlert: boolean;
}

export const RECORD_VIA_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank transfer",
  reader: "Own card reader",
};

const HAND_BACK_WAYS: Record<string, string> = {
  cash: "in cash",
  bank: "by bank transfer",
  reader: "on your card reader",
};

/** "in cash": how money paid outside the app goes back. */
export const getHandBackWay = (via = "") =>
  HAND_BACK_WAYS[via] ?? "the way they paid";

const getRefundNote = (
  { refundCard, cashBack }: CheckoutMoney,
  name: string,
  cardText: string,
  via: string | undefined,
) => {
  const handBack = getHandBackWay(via);

  if (!cashBack)
    return `${formatMoney(refundCard)} goes back to ${name}’s ${cardText} automatically when you complete checkout.`;

  if (!refundCard)
    return `Give ${formatMoney(cashBack)} back to ${name} ${handBack} when you complete checkout.`;

  return `${formatMoney(refundCard)} goes back to ${name}’s ${cardText} automatically when you complete checkout. Give the other ${formatMoney(cashBack)} back ${handBack}.`;
};

const REVIEW_TOTAL_LABELS: Record<PayMethod, string> = {
  card: "To charge",
  link: "Payment link for",
  record: "To record",
};

export const STEP_LABELS: Partial<Record<CheckoutView, string>> = {
  items: "Items",
  tip: "Tip",
  pay: "Payment",
  review: "Review",
};

export const VIEW_TITLES: Record<CheckoutView, string> = {
  items: "Checkout",
  tip: "Checkout",
  pay: "Checkout",
  review: "Checkout",
  done: "",
  receipt: "Receipt",
  refund: "Refund",
  resend: "Resend receipt",
  add: "Add item",
};

export const row = (
  label: string,
  subtitle: string,
  value: string,
  isAlert = false,
): DetailRow => ({ key: label + value, label, subtitle, value, isAlert });

export const getAdjustNote = ({ adjustment, reason }: CheckoutLine): string => {
  const direction = adjustment < 0 ? "Lowered " : "Raised ";
  const amount = formatMoney(Math.abs(adjustment));

  return `${direction}${amount}: ${reason}`;
};

export const getCheckoutView = (checkout: CheckoutController) => {
  const { props, state, booking, money, goTo } = checkout;

  const { first: name } = booking;

  const cardText = booking.card
    ? (booking.cardLabel ?? `${booking.brand} •••• ${booking.card}`)
    : "";

  let bookedTotal = booking.price;

  for (const [, price] of booking.addons) bookedTotal += price;

  const modeLabel = {
    deposit: `${Math.round((state.paid / bookedTotal) * 100)}% deposit`,
    full: "Full payment",
    card: "Card protection",
    none: "No protection",
  }[state.mode];

  const paidLater = booking.paidLater ?? 0;

  const creditRows = [
    ...(state.paid > 0
      ? [
          row(
            state.mode === "full" ? "Paid in full" : "Deposit paid",
            cardText + (booking.paidOn ? ` · ${booking.paidOn}` : ""),
            formatMoney(-state.paid),
          ),
        ]
      : []),
    ...(paidLater > 0
      ? [
          row(
            "Paid at checkout",
            RECORD_VIA_LABELS[booking.recordedVia ?? ""] ?? "Recorded",
            formatMoney(-paidLater),
          ),
        ]
      : []),
  ];

  const isRefund = money.refundDue > 0;
  const isInCheckout = ["items", "tip", "pay", "review"].includes(state.view);
  const stepIndex = money.steps.indexOf(state.view);

  const goNext = () =>
    goTo(money.steps[Math.min(stepIndex + 1, money.steps.length - 1)]!, 1);

  const back = () => {
    if (isInCheckout) {
      if (stepIndex > 0) goTo(money.steps[stepIndex - 1]!, -1);
      else checkout.exit();
    } else if (state.view === "add") goTo("items", -1);
    else if (state.view === "receipt" && state.fromDone) goTo("done", -1);
    else if (state.view === "resend" && state.isResendFromReceipt)
      goTo("receipt", -1);
    else checkout.exit();
  };

  const leaveDone = (action: "done" | "rebook") =>
    props.onComplete(checkout.getResult(), action);

  const { isOffPlatform, refundCapAll, refundCap } = getRefundCap(state);

  return {
    name,
    cardText,
    modeLabel,
    creditRows,
    isRefund,
    balanceLabel: isRefund ? "Refund due" : "Balance due",
    balanceValue: formatMoney(isRefund ? money.refundDue : money.due),
    isInCheckout,
    stepIndex,
    goNext,
    back,
    leaveDone,
    done: state.done ?? {
      method: "none" as const,
      via: "",
      charged: 0,
      tip: 0,
      refundAuto: 0,
      cashBack: 0,
    },
    isOffPlatform,
    refundCapAll,
    refundCap,
    linkTarget: state.linkVia === "sms" ? booking.phone : booking.email,
    refundNote: isRefund
      ? getRefundNote(money, name, cardText, booking.recordedVia)
      : "",
  };
};

export type CheckoutViewModel = ReturnType<typeof getCheckoutView>;

export const getReviewTotal = (
  { money }: CheckoutController,
  { isRefund }: CheckoutViewModel,
) => {
  if (money.method !== "none")
    return {
      label: REVIEW_TOTAL_LABELS[money.method],
      value: formatMoney(money.charge),
    };

  return isRefund
    ? { label: "Refund due", value: formatMoney(money.refundDue) }
    : { label: "Nothing to pay", value: "£0" };
};
