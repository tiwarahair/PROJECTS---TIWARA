// The past booking sheet's values and actions, and the past checkout values.
import type { CheckoutView } from "../../../../../components/checkout/data";
import type { StudioController } from "../../../core/use-studio";
import {
  refundBookingPayment,
  SecondFactorNeeded,
} from "../../../../../lib/studio-api/money";
import { recordRefund } from "../../../../../lib/studio-api/earnings";
import { SaveError } from "../../../../../lib/studio-writes";
import { formatMoney, roundToPence, toPence } from "../../../../../utils/money";
import { hasTwoFactor } from "../../../core/model";
import { getActionsView } from "./actions";
import { findPastRow, getPastCheckout } from "./checkout";
import { getClientView } from "./client";
import { getCompletedView } from "./completed";
import { getCorrectView } from "./correct";
import { getDisputeView } from "./dispute";
import { getContext } from "./context";
import { getUnpaidView } from "./unpaid";
import { getVisitView } from "./visit";

export const getPastSheetView = (studio: StudioController) => {
  const row = findPastRow(studio);

  if (!row) return null;

  const context = getContext(studio, row);

  return {
    ...getClientView(context),
    ...getVisitView(context),
    ...getActionsView(context),
    ...getUnpaidView(context),
    ...getCompletedView(context),
    ...getCorrectView(context),
    ...getDisputeView(context),
  };
};

export type PastSheetView = NonNullable<ReturnType<typeof getPastSheetView>>;

/** CheckoutSheet's receipt / resend / refund over the past sheet. */
export const getPastCheckoutView = (studio: StudioController) => {
  const { state, setState, actions, context } = studio;

  if (state.sheet !== "past" || !state.pastCheckoutPanel) return null;

  const row = findPastRow(studio);

  if (!row) return null;

  const { booking, done } = getPastCheckout(state, row);
  const back = () => setState({ pastCheckoutPanel: null });

  return {
    bookingId: row.remoteId,
    booking,
    start: state.pastCheckoutPanel as CheckoutView,
    done,
    refunded: row.refunded || 0,
    onExit: back,
    onComplete: back,
    onPay: () =>
      Promise.reject(new Error("This booking is already checked out.")),
    onRefund: (amount: number, reason: string, isOffPlatform: boolean) => {
      const previous = state.pastNew;

      const markRefunded = (refunded = amount) =>
        actions.patchPast(row.pastId, (current) => ({
          refunded: roundToPence((current.refunded || 0) + refunded),
          refundReason: reason,
        }));

      markRefunded();

      const { remoteId } = row;

      // given back outside the app (cash, bank, card reader): saved as recorded, no money moves through us
      if (isOffPlatform) {
        context.sync.save(
          () => recordRefund(remoteId, toPence(amount), reason),
          { pastNew: previous },
        );

        return;
      }

      const refund = async () => {
        try {
          const refundedPence = await refundBookingPayment(
            remoteId,
            toPence(amount),
            reason,
          );

          if (refundedPence < toPence(amount)) {
            const refunded = refundedPence / 100;

            setState({ pastNew: previous });
            markRefunded(refunded);

            actions.showToast(
              `Only ${formatMoney(refunded, { pence: "always" })} was refunded. Try the rest again.`,
            );
          }
        } catch (error) {
          setState({ pastNew: previous });

          if (error instanceof SecondFactorNeeded) {
            if (!hasTwoFactor(context.getState()))
              return actions.openTwoFactor("secure");

            actions.openTwoFactor("taxcode", { flow: "info", from: "refund" });

            context.memo.afterSecondFactor = () => {
              markRefunded();
              void refund();
            };

            return;
          }

          actions.showToast(
            error instanceof SaveError
              ? error.message
              : "The refund didn’t go through. Try again.",
          );
        }
      };

      void refund();
    },
  };
};
