import type { CheckoutView } from "./data";
import { getRefundAmount } from "./schemas";
import { getReviewTotal } from "./view";
import type { CheckoutViewModel } from "./view";
import type { CheckoutController } from "./use-checkout";
import { formatMoney } from "../../utils/money";

interface Footer {
  show: boolean;
  hasTotal: boolean;
  totalLabel: string;
  totalValue: string;
  hasPrimary: boolean;
  primaryLabel: string;
  primaryRun: () => void;
  isPrimaryDisabled: boolean;
  hasSecondary: boolean;
  secondaryLabel: string;
  secondaryRun: () => void;
}

type FooterBuilder = (
  checkout: CheckoutController,
  view: CheckoutViewModel,
) => Partial<Footer> | null;

const getReviewPrimaryLabel = ({ state, money }: CheckoutController) => {
  if (state.busy) return "Charging";

  if (state.decline === "soft") return `Retry card (${state.tries} of 2 left)`;

  if (money.method === "card") return `Charge ${formatMoney(money.charge)}`;

  if (money.method === "link") return "Send link and complete";

  return "Complete checkout";
};

const FOOTERS: Partial<Record<CheckoutView, FooterBuilder>> = {
  detail: ({ state, startCheckout }, view) =>
    state.status === "arrived" || state.status === "unpaid"
      ? {
          hasTotal: true,
          totalLabel: view.balanceLabel,
          totalValue: view.balanceValue,
          primaryLabel: "Checkout",
          primaryRun: startCheckout,
        }
      : null,
  items: ({ setState }, view) => ({
    hasTotal: true,
    totalLabel: view.balanceLabel,
    totalValue: view.balanceValue,
    primaryLabel: "Continue",
    primaryRun: () => {
      setState({ adjustingLineId: null });
      view.goNext();
    },
  }),
  tip: ({ money }, view) => ({
    hasTotal: true,
    totalLabel: money.method === "record" ? "To record" : "To charge",
    totalValue: formatMoney(money.charge),
    primaryLabel: "Continue",
    primaryRun: view.goNext,
    isPrimaryDisabled: money.isTipTooHigh,
  }),
  pay: (_checkout, view) => ({
    hasTotal: true,
    totalLabel: view.balanceLabel,
    totalValue: view.balanceValue,
    primaryLabel: "Continue",
    primaryRun: view.goNext,
  }),
  review: (checkout, view) => {
    const total = getReviewTotal(checkout, view);

    return {
      hasTotal: true,
      totalLabel: total.label,
      totalValue: total.value,
      hasPrimary: checkout.state.decline !== "hard",
      isPrimaryDisabled: checkout.state.busy || checkout.money.isTipTooHigh,
      primaryLabel: getReviewPrimaryLabel(checkout),
      primaryRun: () => {
        if (!checkout.state.busy) checkout.complete();
      },
    };
  },
  done: (_checkout, view) => ({
    hasSecondary: true,
    secondaryLabel: "Book again",
    secondaryRun: () => view.leaveDone("rebook"),
    primaryLabel: "Done",
    primaryRun: () => view.leaveDone("done"),
  }),
  refund: (
    { refundForm, refundValues, setState },
    { isOffPlatform, refundCap },
  ) => {
    const amount = getRefundAmount(refundValues, refundCap);
    const isWithinCap = amount > 0 && amount <= refundCap;

    return {
      hasTotal: true,
      totalLabel: isOffPlatform ? "Refund to record" : "Refund",
      totalValue: formatMoney(amount <= refundCap ? amount : 0),
      primaryLabel:
        (isOffPlatform ? "Record refund" : "Refund") +
        (isWithinCap ? ` ${formatMoney(amount)}` : ""),
      primaryRun: () =>
        void refundForm.handleSubmit((refund) =>
          setState({
            dialog: "refund",
            refundFinal: getRefundAmount(refund, refundCap),
            refund,
          }),
        )(),
      isPrimaryDisabled: amount > refundCap,
    };
  },
  resend: ({ state, resendReceipt }) => ({
    primaryLabel: state.busy ? "Sending" : "Send receipt",
    isPrimaryDisabled: state.busy,
    primaryRun: () => void resendReceipt(),
  }),
};

export const getFooter = (
  checkout: CheckoutController,
  view: CheckoutViewModel,
): Footer => {
  const patch = FOOTERS[checkout.state.view]?.(checkout, view);

  return {
    show: !!patch,
    hasTotal: false,
    totalLabel: "",
    totalValue: "",
    hasPrimary: true,
    primaryLabel: "",
    primaryRun: () => {},
    isPrimaryDisabled: false,
    hasSecondary: false,
    secondaryLabel: "",
    secondaryRun: () => {},
    ...patch,
  };
};
