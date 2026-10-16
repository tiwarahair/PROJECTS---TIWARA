// The past booking sheet's values and actions, and the past checkout values.
import type { CheckoutView } from "../../../../../components/checkout/data";
import type { StudioController } from "../../../core/use-studio";
import { roundToPence } from "../../../../../utils/money";
import { getActionsView } from "./actions";
import { findPastRow, getPastCheckout } from "./checkout";
import { getClientView } from "./client";
import { getCompletedView } from "./completed";
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
  };
};

export type PastSheetView = NonNullable<ReturnType<typeof getPastSheetView>>;

/** CheckoutSheet's receipt / resend / refund over the past sheet. */
export const getPastCheckoutView = (studio: StudioController) => {
  const { state, setState, actions, seedPast } = studio;

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
    onRefund: (amount: number, reason: string) =>
      actions.patchPast(
        row.pastId,
        (current) => ({
          refunded: roundToPence((current.refunded || 0) + amount),
          refundReason: reason,
        }),
        seedPast,
      ),
  };
};
