import { admin } from "./admin.ts";
import { findEarlierRefund } from "./earlier-refund.ts";
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
const refundBooking = async (
  { bookingId, paymentIntentId, amount, reason }: BookingRefund,
  failures: number,
) => {
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
      idempotencyKey: getCancelRefundKey(
        bookingId,
        reason,
        refundAmount,
        failures,
      ),
    },
  );

  return { id, amount: refundAmount };
};

const getRefundFailures = async (bookingId: string) => {
  const { data, error } = await admin
    .from("bookings")
    .select("cancellation")
    .eq("id", bookingId)
    .single();

  if (error) throw error;

  return Number(data.cancellation?.refund_failures ?? 0);
};

/**
 * After a booking is cancelled: refunds what goes back now and records it on the cancellation. A failure is counted,
 * so the settlement job's next try uses a new Stripe key, waits longer, and stops after five.
 */
export const refundCancellation = async (refund: BookingRefund) => {
  if (!refund.amount) return;

  try {
    const made = await refundBooking(
      refund,
      await getRefundFailures(refund.bookingId),
    );

    const { error } = await admin.rpc("set_cancel_refund", {
      target: refund.bookingId,
      refund_id: made.id,
      refunded: made.amount,
    });

    if (error) throw error;
  } catch (refundError) {
    await admin.rpc("note_refund_failure", {
      target: refund.bookingId,
      message:
        refundError instanceof Error ? refundError.message : String(refundError),
    });

    throw refundError;
  }
};
