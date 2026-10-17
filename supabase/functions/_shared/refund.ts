import { findEarlierRefund } from "./earlier-refund.ts";
import { stripe } from "./stripe.ts";

interface BookingRefund {
  bookingId: string;
  paymentIntentId: string | null;
  amount: number;
  reason: string;
}

/** Refunds a booking's payment once per reason, taking the stylist's share back when they were paid. */
export const refundBooking = async ({ bookingId, paymentIntentId, amount, reason }: BookingRefund) => {
  if (!amount || !paymentIntentId) return null;

  const { data: earlier } = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 });
  const madeBefore = findEarlierRefund(earlier, reason);

  if (madeBefore) return madeBefore.id;

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  const { id } = await stripe.refunds.create(
    {
      payment_intent: paymentIntentId,
      amount,
      metadata: { booking_id: bookingId, reason },
      ...(intent.transfer_data ? { reverse_transfer: true } : {}),
    },
    { idempotencyKey: `booking:${bookingId}:${reason}-refund` },
  );

  return id;
};
