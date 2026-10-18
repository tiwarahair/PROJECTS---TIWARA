import type Stripe from "npm:stripe@22.6.2";
import { admin } from "../_shared/admin.ts";
import { stripe } from "../_shared/stripe.ts";

export const onPaymentSucceeded = async (intent: Stripe.PaymentIntent) => {
  // fee charges are recorded by the settlement that made them
  if (intent.metadata.kind === "fee") return;

  const { data: outcome, error } = await admin.rpc("confirm_booking_payment", { intent: intent.id });

  // a payment from another environment sharing this Stripe sandbox
  if (error?.message === "booking_not_found") return;

  if (error) throw error;

  // the card a deposit or card-on-file booking saved, for fees later
  if (intent.setup_future_usage && typeof intent.payment_method === "string")
    await admin
      .from("bookings")
      .update({ stripe_payment_method_id: intent.payment_method })
      .eq("stripe_payment_intent_id", intent.id);

  if (outcome !== "slot_taken") return;

  await stripe.refunds.create(
    {
      payment_intent: intent.id,
      metadata: { reason: "slot_taken" },
      ...(intent.transfer_data ? { reverse_transfer: true, refund_application_fee: true } : {}),
    },
    { idempotencyKey: `payment:${intent.id}:slot-taken-refund` },
  );
};

export const onPaymentFailed = async ({ id, last_payment_error }: Stripe.PaymentIntent) => {
  const { data: booking } = await admin.from("bookings").select("id").eq("stripe_payment_intent_id", id).maybeSingle();

  if (!booking) return;

  await admin.from("booking_events").insert({
    booking_id: booking.id,
    kind: "payment_failed",
    data: { code: last_payment_error?.decline_code ?? last_payment_error?.code ?? null },
  });
};
