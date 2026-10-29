import { skipReviewInvite } from "../../../../../lib/studio-api/booking-writes";
import {
  cancelBalanceLink,
  recordBalancePaid,
  resendBalanceLink,
} from "../../../../../lib/studio-api/checkout";
import { roundToPence } from "../../../../../utils/money";
import { getLinkDue } from "../../checkout-label";
import { getPastCheckout } from "./checkout";
import { RECORDED_ONLY, getRefundTag } from "./context";
import type { PastContext } from "./context";

const REFUNDABLE_DISPUTES = ["won", "warning_closed"];

export const getCompletedView = (context: PastContext) => {
  const {
    state,
    setState,
    actions,
    row,
    isCompleted,
    patch,
    firstName,
    saveAndRefresh: saveBalance,
    isBusy,
    startBusy,
  } = context;

  if (!isCompleted)
    return {
      hasAwait: false,
      hasLinks: false,
      canRefund: false,
      refundTag: "",
      awaitBody: "",
      canCancelLink: false,
      canSkipReview: false,
    };

  const checkout = getPastCheckout(state, row);
  const first = firstName("your client");
  const isAwaiting = getLinkDue(row) !== null;
  const refunded = row.refunded || 0;
  const left = roundToPence(checkout.cap - refunded);

  return {
    hasAwait: isAwaiting,
    awaitBody: `Payment link for £${checkout.done.charged} sent to ${first}. They can pay by card, Apple Pay or Google Pay.`,
    resendLink: () => {
      saveBalance(startBusy(resendBalanceLink));
      actions.showToast(`Payment link resent to ${first}`);
    },
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
              meta: "Paid · Cash",
            });

            saveBalance((bookingId) => recordBalancePaid(bookingId, "cash", 0));
            actions.showToast("Payment recorded");
          },
        },
      }),
    isResendBusy: isBusy,
    canCancelLink: isAwaiting,
    cancelLink: () =>
      setState({
        confirm: {
          title: "Cancel the payment link?",
          body: `${first} won’t be able to pay with it. The booking moves to Unpaid and back into Due for checkout.`,
          yesLabel: "Cancel link",
          yes: () => {
            setState({ confirm: null });
            actions.closeSheet();
            actions.showToast("Payment link cancelled");
            saveBalance(cancelBalanceLink);
          },
        },
      }),
    refundTag: getRefundTag(refunded, left),
    hasLinks: !isAwaiting,
    viewReceipt: () => setState({ pastCheckoutPanel: "receipt" }),
    resendReceipt: () => setState({ pastCheckoutPanel: "resend" }),
    canSkipReview: !!row.canSkipReview,
    skipReview: () => {
      patch({ canSkipReview: false });
      saveBalance(skipReviewInvite);
      actions.showToast(`${first} won’t be asked for a review`);
    },
    // a disputed payment is the bank's to settle, unless the stylist won it or an inquiry closed
    canRefund:
      !isAwaiting &&
      left > 0 &&
      (!row.dispute || REFUNDABLE_DISPUTES.includes(row.dispute.status)),
    openRefund: () => setState({ pastCheckoutPanel: "refund" }),
  };
};
