import type Stripe from "npm:stripe@22.6.2";
import { admin } from "../_shared/admin.ts";
import { stripe } from "../_shared/stripe.ts";

const onLinkPaid = async (intent: Stripe.PaymentIntent) => {
  const { data: outcome, error } = await admin.rpc("confirm_link_payment", {
    intent: intent.id,
    transfer_pending: intent.metadata.transfer_pending === "true",
    target_link: intent.metadata.link_id ?? null,
  });

  if (error?.message === "link_not_found") return;

  if (error) throw error;

  // the fee was waived or paid another way while the client paid
  if (outcome === "refund")
    await stripe.refunds.create(
      { payment_intent: intent.id, ...(intent.transfer_data ? { reverse_transfer: true } : {}) },
      { idempotencyKey: `link:${intent.id}:settled-refund` },
    );
};

export const onPaymentSucceeded = async (intent: Stripe.PaymentIntent) => {
  // fee charges are recorded by the settlement that made them
  if (intent.metadata.kind === "fee") return;

  if (intent.metadata.kind === "link") return onLinkPaid(intent);

  const { data: outcome, error } = await admin.rpc("confirm_booking_payment", {
    intent: intent.id,
    amount: intent.amount_received,
    target_booking: intent.metadata.booking_id ?? null,
  });

  // a payment from another environment sharing this Stripe sandbox
  if (error?.message === "booking_not_found") return;

  if (error) throw error;

  // the card a deposit or card-on-file booking saved, for fees later
  if ((outcome === "confirmed" || outcome === "duplicate") && intent.setup_future_usage && typeof intent.payment_method === "string")
    await admin
      .from("bookings")
      .update({ stripe_payment_method_id: intent.payment_method })
      .eq("stripe_payment_intent_id", intent.id);

  // the time was taken meanwhile, or (a stylist's booking) it was confirmed without protection, changed or cancelled
  if (outcome !== "slot_taken" && outcome !== "refund") return;

  await stripe.refunds.create(
    {
      payment_intent: intent.id,
      metadata: { reason: outcome === "slot_taken" ? "slot_taken" : "not_needed" },
      ...(intent.transfer_data ? { reverse_transfer: true, refund_application_fee: true } : {}),
    },
    { idempotencyKey: `payment:${intent.id}:${outcome === "slot_taken" ? "slot-taken" : "not-needed"}-refund` },
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

export const onRefundCreated = async ({ id, amount, payment_intent: intent, status, metadata }: Stripe.Refund) => {
  // ours carry the booking and are recorded, with their reason, by the code that made them
  if (!intent || metadata?.booking_id || status === "failed" || status === "canceled") return;

  const { error } = await admin.rpc("record_stripe_refund", {
    intent: typeof intent === "string" ? intent : intent.id,
    refund_id: id,
    amount,
  });

  if (error) throw error;
};

export const onDispute = async ({ id, amount, reason, status, payment_intent: intent }: Stripe.Dispute) => {
  const { error } = await admin.rpc("record_dispute", {
    dispute: { id, amount, reason, status, payment_intent: typeof intent === "string" ? intent : intent?.id },
  });

  if (error) throw error;
};
