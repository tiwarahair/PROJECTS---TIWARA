import type Stripe from "npm:stripe@22.6.2";
import { admin } from "../_shared/admin.ts";
import { stripe } from "../_shared/stripe.ts";

/** Confirms the paid booking, or refunds in full when its hold lapsed and someone else took the time. */
export const onPaymentSucceeded = async (intent: Stripe.PaymentIntent) => {
  const { data: outcome, error } = await admin.rpc("confirm_booking_payment", { intent: intent.id });

  // a payment from another environment sharing this Stripe sandbox
  if (error?.message === "booking_not_found") return;

  if (error) throw error;

  if (outcome !== "slot_taken") return;

  await stripe.refunds.create(
    {
      payment_intent: intent.id,
      metadata: { reason: "slot_taken" },
      // a destination charge takes the money back from the stylist and the fee back from the platform
      ...(intent.transfer_data ? { reverse_transfer: true, refund_application_fee: true } : {}),
    },
    { idempotencyKey: `payment:${intent.id}:slot-taken-refund` },
  );
};

/** Notes the decline on the booking; the hold stays so the client can try again. */
export const onPaymentFailed = async ({ id, last_payment_error }: Stripe.PaymentIntent) => {
  const { data: booking } = await admin.from("bookings").select("id").eq("stripe_payment_intent_id", id).maybeSingle();

  if (!booking) return;

  await admin.from("booking_events").insert({
    booking_id: booking.id,
    kind: "payment_failed",
    data: { code: last_payment_error?.decline_code ?? last_payment_error?.code ?? null },
  });
};
