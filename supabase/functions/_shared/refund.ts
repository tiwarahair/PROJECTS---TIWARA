import { admin } from "./admin.ts";
import { findEarlierRefund } from "./earlier-refund.ts";
import { reverseLaterTransfer } from "./later-transfer.ts";
import { getRefundable } from "./refundable.ts";
import { getCancelRefundKey } from "./stripe-keys.ts";
import { stripe } from "./stripe.ts";

interface BookingRefund {
  bookingId: string;
  paymentIntentId: string | null;
  amount: number;
  reason: string;
}

/**
 * Refunds a booking's payment once per reason (no more than is still on it), taking the stylist's share back when
 * they were paid. Gives the refund and its amount, or no id when nothing could be refunded.
 */
const refundBooking = async ({ bookingId, paymentIntentId, amount, reason }: BookingRefund, failures: number) => {
  if (!paymentIntentId) return { id: null, amount: 0 };

  const { data: earlier } = await stripe.refunds.list({
    payment_intent: paymentIntentId,
    limit: 100,
  });

  const madeBefore = findEarlierRefund(earlier, reason);

  if (madeBefore) return { id: madeBefore.id, amount: madeBefore.amount };

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });

  const refundAmount = Math.min(amount, getRefundable(intent.latest_charge));

  if (refundAmount <= 0) return { id: null, amount: 0 };

  const { id } = await stripe.refunds.create(
    {
      payment_intent: paymentIntentId,
      amount: refundAmount,
      metadata: { booking_id: bookingId, reason },
      ...(intent.transfer_data ? { reverse_transfer: true } : {}),
    },
    {
      idempotencyKey: getCancelRefundKey(bookingId, reason, refundAmount, failures),
    },
  );

  return { id, amount: refundAmount };
};

const getCancellation = async (bookingId: string) => {
  const { data, error } = await admin.from("bookings").select("cancellation").eq("id", bookingId).single();

  if (error) throw error;

  return {
    failures: Number(data.cancellation?.refund_failures ?? 0),
    feeRefund: Number(data.cancellation?.fee_refund_pence ?? 0),
  };
};

/**
 * A free cancellation's booking fee is ours to give back, but Stripe took the whole refund from the stylist's
 * transfer: that part of our fee goes back to them. Once only, even when tried again.
 */
const giveBookingFeeBack = async (bookingId: string, paymentIntentId: string, amount: number) => {
  const { latest_charge: charge } = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });

  if (!charge || typeof charge === "string" || !charge.application_fee) return;

  const feeId = typeof charge.application_fee === "string" ? charge.application_fee : charge.application_fee.id;

  const { data: earlier } = await stripe.applicationFees.listRefunds(feeId, {
    limit: 100,
  });

  if (earlier.some(({ metadata }) => metadata?.booking_fee_back === bookingId)) return;

  await stripe.applicationFees.createRefund(
    feeId,
    { amount, metadata: { booking_fee_back: bookingId } },
    { idempotencyKey: `booking:${bookingId}:booking-fee-back` },
  );
};

/**
 * After a booking is cancelled: refunds what goes back now and records it on the cancellation. A failure is counted,
 * so the settlement job's next try uses a new Stripe key, waits longer, and stops after five.
 */
export const refundCancellation = async (refund: BookingRefund) => {
  if (!refund.amount) return;

  try {
    const { failures, feeRefund } = await getCancellation(refund.bookingId);
    const made = await refundBooking(refund, failures);

    if (made.id && refund.paymentIntentId)
      await reverseLaterTransfer(
        refund.paymentIntentId,
        { id: made.id, amount: made.amount },
        Math.min(feeRefund, made.amount),
      );

    if (made.id && refund.paymentIntentId && feeRefund > 0)
      await giveBookingFeeBack(refund.bookingId, refund.paymentIntentId, Math.min(feeRefund, made.amount));

    const { error } = await admin.rpc("set_cancel_refund", {
      target: refund.bookingId,
      refund_id: made.id,
      refunded: made.amount,
    });

    if (error) throw error;
  } catch (refundError) {
    await admin.rpc("note_refund_failure", {
      target: refund.bookingId,
      message: refundError instanceof Error ? refundError.message : String(refundError),
    });

    throw refundError;
  }
};
