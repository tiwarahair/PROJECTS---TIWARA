// The booking sheet's values and actions: the status menu, cancel / no-show / checkout, reschedule, payment.
import type { StudioController } from "../../core/use-studio";
import { getCancelView } from "./cancel-view";
import { getChangeClientView } from "./change-client-view";
import { getCheckoutView } from "./checkout-view";
import { getClientView } from "./client-view";
import { getContext } from "./context";
import { getFooterView } from "./footer-view";
import { getNoShowView } from "./no-show-view";
import { getPanelsView } from "./panels-view";
import { getPaymentView } from "./payment-view";
import { getRescheduleView } from "./reschedule-view";
import { getStatusMenu } from "./status-menu";
import { getStepsView } from "./steps-view";

export const getBookingSheetView = (studio: StudioController) => {
  const context = getContext(studio);

  if (!context) return null;

  const { booking, raw, patchBooking, finish } = context;

  return {
    booking,
    raw,
    patchBooking,
    finish,
    ...getStepsView(context),
    ...getClientView(context),
    ...getStatusMenu(context),
    // payment
    ...getPaymentView(context),
    // footer
    ...getFooterView(context),
    ...getPanelsView(context),
    // change client
    ...getChangeClientView(context),
    // reschedule
    ...getRescheduleView(context),
    // cancel
    ...getCancelView(context),
    // no-show
    ...getNoShowView(context),
    ...getCheckoutView(context),
  };
};

export type BookingSheetView = NonNullable<
  ReturnType<typeof getBookingSheetView>
>;
