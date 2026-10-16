import type { DialogKind } from "./data";
import type { CheckoutViewModel } from "./view";
import type { CheckoutController } from "./use-checkout";
import { formatMoney, roundToPence } from "../../utils/money";

interface Dialog {
  title: string;
  body: string;
  yes: string;
  cancel: string;
  run: () => void;
}

const getWaiveWhat = (
  { state }: CheckoutController,
  { fee, feeExtra }: CheckoutViewModel,
) => {
  if (state.mode === "deposit")
    return state.isNonRefundable
      ? `She won’t be charged the extra ${formatMoney(feeExtra)}. Her ${formatMoney(state.paid)} deposit is non-refundable and will be kept.`
      : `Her ${formatMoney(state.paid)} deposit will be refunded and she won’t be charged anything else.`;

  if (state.mode === "full")
    return `The ${formatMoney(fee)} will be refunded to her card.`;

  return "She won’t be charged.";
};

const DIALOGS: Record<
  DialogKind,
  (checkout: CheckoutController, view: CheckoutViewModel) => Dialog
> = {
  waive: (checkout, view) => ({
    title: `Waive ${view.name}’s ${formatMoney(view.fee)} fee?`,
    body: `${getWaiveWhat(checkout, view)} The booking fee isn’t refunded.`,
    yes: "Waive fee",
    cancel: "Keep fee",
    run: () => {
      checkout.setState({ dialog: null, status: "feeWaived" });
      checkout.showToast("Fee waived");
    },
  }),
  refund: (
    { props, state, setState, booking, goTo, showToast },
    { name, isOffPlatform },
  ) => {
    const amount = state.refundFinal || 0;

    return {
      title: isOffPlatform
        ? `Record a ${formatMoney(amount)} refund?`
        : `Refund ${formatMoney(amount)} to ${name}’s card ending ${booking.card}?`,
      body: isOffPlatform
        ? "Recorded only, refund the client directly."
        : "It usually takes 5–10 business days to arrive. The card fee isn’t returned.",
      yes: isOffPlatform ? "Record refund" : `Refund ${formatMoney(amount)}`,
      cancel: "Cancel",
      run: () => {
        setState({
          dialog: null,
          refunded: roundToPence(state.refunded + amount),
          refundLast: state.refundReason,
        });

        props.onRefund?.(amount, state.refundReason, isOffPlatform);
        goTo("detail", -1);

        showToast(
          isOffPlatform
            ? "Refund recorded"
            : `Refund of ${formatMoney(amount)} on its way`,
        );
      },
    };
  },
  cancelLink: ({ props, setState, showToast }, { name }) => ({
    title: "Cancel the payment link?",
    body: `${name} won’t be able to pay with it. The booking moves to Unpaid and back into Due for checkout.`,
    yes: "Cancel link",
    cancel: "Keep link",
    run: () => {
      setState({ dialog: null, status: "unpaid", done: null });
      showToast("Payment link cancelled");
      props.onCancelLink?.();
    },
  }),
  retryFee: ({ setState, showToast, booking }, { name, feeExtra }) => ({
    title: `Charge ${formatMoney(feeExtra)} to ${name}’s card ending ${booking.card}?`,
    body: "This uses your last retry. If it’s declined again, send a payment link or record the payment instead.",
    yes: `Charge ${formatMoney(feeExtra)}`,
    cancel: "Not now",
    run: () => {
      setState({ dialog: null, status: "feeCollected" });
      showToast(`${formatMoney(feeExtra)} charged`);
    },
  }),
  recordFee: ({ setState, showToast }, { feeExtra }) => ({
    title: `Record ${formatMoney(feeExtra)} as paid?`,
    body: "Recorded only, no money moves through Tiwára’s House.",
    yes: "Record as paid",
    cancel: "Cancel",
    run: () => {
      setState({ dialog: null, status: "feeCollected" });
      showToast("Payment recorded");
    },
  }),
  undoNs: ({ setState, showToast }, { name }) => ({
    title: "Undo no-show?",
    body: `Only use this if ${name} did attend. It reverses the no-show entirely, with no fee, and the booking goes back to Arrived so you can check out.`,
    yes: "Undo no-show",
    cancel: "Cancel",
    run: () => {
      setState({ dialog: null, status: "arrived" });
      showToast("No-show undone");
    },
  }),
};

export const getDialog = (
  checkout: CheckoutController,
  view: CheckoutViewModel,
): Dialog | null =>
  checkout.state.dialog ? DIALOGS[checkout.state.dialog](checkout, view) : null;
