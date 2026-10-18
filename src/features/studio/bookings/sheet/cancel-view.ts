import { cancelStudioBooking } from "../../../../lib/studio-api/bookings";
import type { SheetContext } from "./context";

const getNotice = (hoursToStart: number) =>
  hoursToStart < 48
    ? `${Math.max(1, Math.round(hoursToStart))} hours before`
    : `${Math.round(hoursToStart / 24)} days before`;

// the outcome copy: a late fee is kept, nothing was taken, or a full refund
const getCancelCopy = (
  { state, booking, lateFee }: SheetContext,
  isFeeKept: boolean,
) => {
  if (isFeeKept)
    return {
      meta: "Fee pending",
      noteTail: ` ${lateFee.subtitle}.`,
      toast: `Cancelled. ${lateFee.label} fee pending`,
    };

  const { mode } = booking.agreedPolicy ?? state.policy;

  if (mode === "card" || mode === "none")
    return { meta: "No charge", noteTail: "", toast: "Booking cancelled" };

  return {
    meta: "Refunded",
    noteTail: " Refunded in full.",
    toast: `Cancelled. ${booking.firstName} refunded in full`,
  };
};

const getCancelBody = ({ state, booking, isLate, lateFee }: SheetContext) => {
  const { firstName } = booking;

  const { window } = booking.agreedPolicy ?? state.policy;
  const windowText = window < 1 ? "30-minute" : `${window}-hour`;

  if (state.cancelWho === "me")
    return `Cancelling refunds ${firstName} in full, including the booking fee, and frees the slot for online booking.`;

  if (!isLate)
    return `${firstName} is cancelling outside your ${windowText} window, so there is no fee. ${lateFee.refund}. The slot opens up for online booking.`;

  if (lateFee.amount > 0)
    return `${firstName} is cancelling inside your ${windowText} window, so your policy charges a ${lateFee.label} late cancellation fee (${lateFee.subtitle}). The slot opens up.`;

  const refundNote = lateFee.refund.toLowerCase();

  return `${firstName} is cancelling inside your ${windowText} window. Your policy has no late cancellation fee: ${refundNote}. The slot opens up.`;
};

// ---- cancel ----
export const getCancelView = (context: SheetContext) => {
  const { state, actions, booking, hoursToStart, isLate, lateFee } = context;

  const isFeeShown =
    state.cancelWho === "client" && isLate && lateFee.amount > 0;

  const cancel = () => {
    const isFeeKept = isFeeShown && state.cancelFee;
    const isMine = state.cancelWho === "me";
    const who = isMine ? "you" : booking.firstName;
    const { meta, noteTail, toast } = getCancelCopy(context, isFeeKept);
    const reason = state.cancelReason.trim();
    const reasonNote = reason ? ` ${reason}` : "";

    context.finish(
      {
        status: "Cancelled",
        feeKept: isFeeKept,
        feePending: isFeeKept,
        feeLabel: lateFee.label,
        meta,
        note: `Cancelled by ${who} ${getNotice(hoursToStart)}.${noteTail}${reasonNote}`,
      },
      toast,
      {
        save: (bookingId) =>
          cancelStudioBooking({
            bookingId,
            who: isMine ? "stylist" : "client",
            waiveFee: isFeeShown && !state.cancelFee,
            reason,
          }),
      },
    );

    actions.closeSheet();
  };

  return {
    cancelWhoOptions: [
      { id: "client", label: `${booking.firstName} is cancelling` },
      { id: "me", label: "I am cancelling" },
    ],
    cancelBody: getCancelBody(context),
    isFeeShown,
    feeLabel: `Charge the ${lateFee.label || ""} late cancellation fee`,
    cancel,
  };
};
