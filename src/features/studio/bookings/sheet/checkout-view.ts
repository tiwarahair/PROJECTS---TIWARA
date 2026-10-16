import type { CheckoutBooking } from "../../../../components/checkout/data";
import { getClient } from "../../core/model";
import type { CheckoutRecord } from "../../core/types";
import type { SheetContext } from "./context";
import { VIA_LABELS } from "./types";

const getCheckoutLabel = ({
  method,
  charged,
  via,
  refundAuto,
}: CheckoutRecord) => {
  if (method === "link") return `Link sent · £${charged} due`;

  if (method === "record") return `Paid · ${VIA_LABELS[via] || "Recorded"}`;

  if (method === "card") return "Paid · Card";

  return refundAuto > 0 ? `Refunded £${refundAuto}` : "Paid";
};

/** The booking in the shape CheckoutSheet takes. */
const getCheckoutBooking = ({
  state,
  booking,
  paymentMode,
  addonLines,
  servicePrice,
}: SheetContext): CheckoutBooking => {
  const client = booking.client ? getClient(state, booking.client) : null;

  return {
    client: booking.client ? booking.clientName : "Walk-in",
    first: booking.client ? booking.firstName : "your client",
    service: booking.service,
    meta: booking.durationLabel,
    price: servicePrice,
    addons: addonLines.map(({ label, amount }): [string, number] => [
      label,
      amount,
    ]),
    mode: paymentMode,
    paid: booking.paidAmount || 0,
    card: paymentMode === "none" ? null : "4242",
    brand: "Visa",
    paidOn: "",
    phone: client?.phone || "",
    email: client?.email || "",
    day: booking.dayLabel,
    time: booking.timeRange,
    arrived: "",
  };
};

export const getCheckoutView = (context: SheetContext) => {
  const { state, actions, booking } = context;
  const rebook = () => actions.rebookFrom(booking);

  return {
    // done
    doneTitle: `Done, ${booking.firstName} is all set`,
    doneBody:
      state.checkoutMethod === "link"
        ? `A payment link for £${booking.due} is on its way to ${booking.firstName}. The booking is in Past.`
        : "Marked completed and moved to Past.",
    rebook,
    // the embedded checkout's result
    onCheckoutComplete: (result: CheckoutRecord, action: string) => {
      context.finish(
        {
          status: "Completed",
          meta: getCheckoutLabel(result),
          price: result.total,
          checkout: result,
        },
        "Checkout complete",
      );

      if (action === "rebook") rebook();
      else actions.closeSheet();
    },
    checkoutBooking: getCheckoutBooking(context),
  };
};
