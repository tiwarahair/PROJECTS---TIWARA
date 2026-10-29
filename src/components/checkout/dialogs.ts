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

// the last 4 digits aren't always known (a card saved at booking shows as "saved")
const getCardText = (name: string, card: string | null) =>
  /^\d{4}$/.test(card ?? "")
    ? `${name}’s card ending ${card}`
    : "their saved card";

const DIALOGS: Record<
  DialogKind,
  (checkout: CheckoutController, view: CheckoutViewModel) => Dialog
> = {
  refund: (
    { props, state, setState, booking, exit, showToast },
    { name, isOffPlatform },
  ) => {
    const amount = state.refundFinal || 0;

    return {
      title: isOffPlatform
        ? `Record a ${formatMoney(amount)} refund?`
        : `Refund ${formatMoney(amount)} to ${getCardText(name, booking.card)}?`,
      body: isOffPlatform
        ? "Recorded only, refund the client directly."
        : "It usually takes 5–10 business days to arrive. The card fee isn’t returned.",
      yes: isOffPlatform ? "Record refund" : `Refund ${formatMoney(amount)}`,
      cancel: "Cancel",
      run: () => {
        setState({
          dialog: null,
          refunded: roundToPence(state.refunded + amount),
          refundLast: state.refund.reason,
        });

        props.onRefund?.(amount, state.refund.reason, isOffPlatform);
        exit();

        showToast(
          isOffPlatform
            ? "Refund recorded"
            : `Refund of ${formatMoney(amount)} on its way`,
        );
      },
    };
  },
};

export const getDialog = (
  checkout: CheckoutController,
  view: CheckoutViewModel,
): Dialog | null =>
  checkout.state.dialog ? DIALOGS[checkout.state.dialog](checkout, view) : null;
