import { roundToPence } from "../../../../../utils/money";
import { getPastCheckout } from "./checkout";
import { RECORDED_ONLY, getRefundTag } from "./context";
import type { PastContext } from "./context";

export const getCompletedView = ({
  state,
  setState,
  actions,
  row,
  isCompleted,
  patch,
  firstName,
}: PastContext) => {
  if (!isCompleted)
    return {
      hasAwait: false,
      hasLinks: false,
      canRefund: false,
      refundTag: "",
      awaitBody: "",
      canCancelLink: false,
    };

  const { original } = row;
  const checkout = getPastCheckout(state, row);
  const first = firstName("your client");
  const isAwaiting = checkout.done.method === "link";
  const refunded = row.refunded || 0;
  const left = roundToPence(checkout.cap - refunded);

  return {
    hasAwait: isAwaiting,
    awaitBody: `Payment link for £${checkout.done.charged} sent to ${first}. They can pay by card, Apple Pay or Google Pay, and add a tip.`,
    resendLink: () => actions.showToast(`Payment link resent to ${first}`),
    recordPaid: () =>
      setState({
        confirm: {
          title: `Record £${checkout.done.charged} as paid?`,
          body: RECORDED_ONLY,
          yesLabel: "Record as paid",
          yes: () => {
            setState({ confirm: null });

            patch({
              linkPaid: true,
              linkVia: "cash",
              meta: "Paid · Recorded",
            });

            actions.showToast("Payment recorded");
          },
        },
      }),
    canCancelLink: isAwaiting && !!original,
    cancelLink: () =>
      setState({
        confirm: {
          title: "Cancel the payment link?",
          body: `${first} won’t be able to pay with it. The booking moves to Unpaid and back into Due for checkout.`,
          yesLabel: "Cancel link",
          yes: () => {
            if (!original) return;

            setState({
              confirm: null,
              bookings: state.bookings.concat([
                { ...original, status: "arrived", checkoutUnpaid: true },
              ]),
              pastNew: state.pastNew.filter(
                ({ pastId }) => pastId !== row.pastId,
              ),
            });

            actions.closeSheet();
            actions.showToast("Payment link cancelled");
          },
        },
      }),
    refundTag: getRefundTag(refunded, left),
    hasLinks: !isAwaiting,
    viewReceipt: () => setState({ pastCheckoutPanel: "receipt" }),
    resendReceipt: () => setState({ pastCheckoutPanel: "resend" }),
    canRefund: !isAwaiting && left > 0,
    openRefund: () => setState({ pastCheckoutPanel: "refund" }),
  };
};
