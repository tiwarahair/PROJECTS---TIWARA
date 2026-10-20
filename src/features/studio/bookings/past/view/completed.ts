import {
  cancelBalanceLink,
  recordBalancePaid,
  resendBalanceLink,
} from "../../../../../lib/studio-api/checkout";
import { fetchStudioBooking } from "../../../../../lib/studio-api/bookings";
import { roundToPence } from "../../../../../utils/money";
import { mergeBookingRows } from "../../live-records";
import { getPastCheckout } from "./checkout";
import { RECORDED_ONLY, getRefundTag } from "./context";
import type { PastContext } from "./context";

export const getCompletedView = (context: PastContext) => {
  const { state, setState, actions, row, isCompleted, patch, firstName } =
    context;

  if (!isCompleted)
    return {
      hasAwait: false,
      hasLinks: false,
      canRefund: false,
      refundTag: "",
      awaitBody: "",
      canCancelLink: false,
    };

  const { original, remoteId } = row;
  const checkout = getPastCheckout(state, row);
  const first = firstName("your client");
  const isAwaiting = checkout.done.method === "link" && !row.linkPaid;
  const refunded = row.refunded || 0;
  const left = roundToPence(checkout.cap - refunded);

  const saveBalance = (task: (bookingId: string) => Promise<unknown>) =>
    context.saveFee(async (bookingId) => {
      await task(bookingId);

      const fresh = await fetchStudioBooking(bookingId);

      if (fresh) setState((current) => mergeBookingRows(current, [fresh]));
    }, state.pastNew);

  return {
    hasAwait: isAwaiting,
    awaitBody: `Payment link for £${checkout.done.charged} sent to ${first}. They can pay by card, Apple Pay or Google Pay.`,
    resendLink: () => {
      saveBalance(resendBalanceLink);
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
    canCancelLink: isAwaiting && (!!original || !!remoteId),
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

            if (remoteId) return saveBalance(cancelBalanceLink);

            if (!original) return;

            setState({
              bookings: state.bookings.concat([
                { ...original, status: "arrived", checkoutUnpaid: true },
              ]),
              pastNew: state.pastNew.filter(
                ({ pastId }) => pastId !== row.pastId,
              ),
            });
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
