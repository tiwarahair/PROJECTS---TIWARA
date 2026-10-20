// The past booking sheet's values and actions, and the past checkout values.
import type { CheckoutView } from "../../../../../components/checkout/data";
import type { StudioController } from "../../../core/use-studio";
import {
  refundBookingPayment,
  SecondFactorNeeded,
} from "../../../../../lib/studio-api/money";
import { SaveError } from "../../../../../lib/studio-writes";
import { formatMoney, roundToPence } from "../../../../../utils/money";
import { toPence } from "../../../../booking/logic/payment";
import { hasTwoFactor } from "../../../core/model";
import { getActionsView } from "./actions";
import { findPastRow, getPastCheckout } from "./checkout";
import { getClientView } from "./client";
import { getCompletedView } from "./completed";
import { getCorrectView } from "./correct";
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
  };
};

export type PastSheetView = NonNullable<ReturnType<typeof getPastSheetView>>;

/** CheckoutSheet's receipt / resend / refund over the past sheet. */
export const getPastCheckoutView = (studio: StudioController) => {
  const { state, setState, actions, seedPast, context } = studio;

  if (state.sheet !== "past" || !state.pastCheckoutPanel) return null;

  const row = findPastRow(studio);

  if (!row) return null;

  const { booking, done } = getPastCheckout(state, row);
  const back = () => setState({ pastCheckoutPanel: null });

  return {
    booking,
    start: state.pastCheckoutPanel as CheckoutView,
    done,
    refunded: row.refunded || 0,
    onExit: back,
    onComplete: back,
    onRefund: (amount: number, reason: string, isOffPlatform: boolean) => {
      const previous = state.pastNew;

      const markRefunded = (refunded = amount) =>
        actions.patchPast(
          row.pastId,
          (current) => ({
            refunded: roundToPence((current.refunded || 0) + refunded),
            refundReason: reason,
          }),
          seedPast,
        );

      markRefunded();

      const { remoteId } = row;

      // a refund made outside the app (cash, bank) is only noted on the row
      if (!remoteId || isOffPlatform) return;

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
