import type { CheckoutBooking } from "../../../../components/checkout/data";
import { formatFullDate } from "../../../../utils/dates";
import type { CheckoutPayment } from "../../../../components/checkout/use-checkout";
import { fetchStudioBooking } from "../../../../lib/studio-api/bookings";
import {
  completeCheckout,
  undoCheckout,
} from "../../../../lib/studio-api/checkout";
import { SaveError } from "../../../../lib/studio-writes";
import { getClient } from "../../core/model";
import type { CheckoutRecord } from "../../core/types";
import { getCheckoutLabel } from "../checkout-label";
import { mergeBookingRows } from "../live-records";
import type { SheetContext } from "./context";

const toPence = (pounds: number) => Math.round(pounds * 100);

export const STILL_SAVING = "Still saving this booking. Try again in a moment.";

export const openCheckout = ({
  storedBooking,
  setState,
  actions,
}: SheetContext) => {
  if (!storedBooking?.remoteId) return actions.showToast(STILL_SAVING);

  setState({
    bookingStep: "checkout",
    checkoutMethod: null,
    statusMenuOpen: false,
  });
};

const getCard = ({ storedBooking }: SheetContext) =>
  storedBooking?.hasSavedCard
    ? {
        card: "saved",
        brand: "",
        cardLabel: storedBooking.cardLabel ?? "Saved card",
      }
    : { card: null, brand: "" };

/** The booking in the shape CheckoutSheet takes. */
const getCheckoutBooking = (context: SheetContext): CheckoutBooking => {
  const {
    state,
    booking,
    storedBooking,
    paymentMode,
    addonLines,
    servicePrice,
  } = context;

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
    ...(paymentMode === "none" ? { card: null, brand: "" } : getCard(context)),
    agreedPrice: storedBooking?.agreedPrice ?? booking.price,
    paidLater: storedBooking?.paidLater,
    refundableOnline: storedBooking?.refundableOnline,
    recordedVia: storedBooking?.recordedVia,
    paidOn: "",
    phone: client?.phone || "",
    email: client?.email || "",
    day: booking.dayLabel,
    time: booking.timeRange,
    ref: storedBooking?.ref,
    receiptDate: storedBooking?.startsAt
      ? formatFullDate(new Date(storedBooking.startsAt))
      : undefined,
    arrived: "",
  };
};

const pay = async (
  remoteId: string,
  { method, via, tip, lines }: CheckoutPayment,
) => {
  try {
    const result = await completeCheckout(remoteId, {
      method,
      via,
      tipPence: toPence(tip),
      lines: lines.map(({ name, subtitle, base, adjustment, reason }) => ({
        name,
        subtitle,
        base_pence: toPence(base),
        adjustment_pence: toPence(adjustment),
        reason,
      })),
    });

    if (result.outcome === "completed") return { outcome: "paid" as const };

    return {
      outcome: result.hard ? ("hard" as const) : ("soft" as const),
      message: result.message.replace(/\.$/, "").toLowerCase(),
    };
  } catch (error) {
    throw error instanceof SaveError
      ? error
      : new Error(
          "That didn’t go through. Check your connection and try again.",
        );
  }
};

const isUndoable = (
  { method, refundAuto }: CheckoutRecord,
  wasCompleted: boolean,
) => (method === "record" || method === "none") && !refundAuto && !wasCompleted;

export const getCheckoutView = (context: SheetContext) => {
  const { state, actions, booking, storedBooking } = context;
  const rebook = () => actions.rebookFrom(booking);
  const remoteId = storedBooking?.remoteId;

  return {
    // done
    doneTitle: `Done, ${booking.firstName} is all set`,
    doneBody:
      state.checkoutMethod === "link"
        ? `A payment link for £${booking.due} is on its way to ${booking.firstName}. The booking is in Past.`
        : "Marked completed and moved to Past.",
    rebook,
    onPay: (payment: CheckoutPayment) =>
      remoteId
        ? pay(remoteId, payment)
        : Promise.reject(new Error(STILL_SAVING)),
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
        {
          // already saved by the checkout: Past gets the server's record of it
          save: async (bookingId: string) => {
            const fresh = await fetchStudioBooking(bookingId);

            if (fresh)
              context.setState((current) => mergeBookingRows(current, [fresh]));
          },
          ...(isUndoable(result, !!storedBooking?.completed)
            ? { undo: undoCheckout }
            : {}),
        },
      );

      if (action === "rebook") rebook();
      else actions.closeSheet();
    },
    checkoutBooking: getCheckoutBooking(context),
  };
};
