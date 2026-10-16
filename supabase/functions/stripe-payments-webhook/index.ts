// Stripe's payment events (classic snapshot events, their own endpoint and secret): a successful payment confirms
// its booking, unless the hold lapsed and someone else took the time, when the payment is refunded in full.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@22.6.2";
import { stripe } from "../_shared/stripe.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const refundTakenSlot = (intent: Stripe.PaymentIntent) =>
  stripe.refunds.create(
    {
      payment_intent: intent.id,
      metadata: { reason: "slot_taken" },
      // a destination charge takes the money back from the stylist and the fee back from the platform
      ...(intent.transfer_data ? { reverse_transfer: true, refund_application_fee: true } : {}),
    },
    { idempotencyKey: `payment:${intent.id}:slot-taken-refund` },
  );

const handlePaid = async (intent: Stripe.PaymentIntent) => {
  const { data: outcome, error } = await admin.rpc("confirm_booking_payment", { intent: intent.id });

  // another environment sharing this Stripe sandbox
  if (error?.message === "booking_not_found") return;

  if (error) throw error;

  if (outcome === "slot_taken") await refundTakenSlot(intent);
};

const handleFailed = async (intent: Stripe.PaymentIntent) => {
  const { data: booking } = await admin
    .from("bookings")
    .select("id")
    .eq("stripe_payment_intent_id", intent.id)
    .maybeSingle();

  if (!booking) return;

  await admin.from("booking_events").insert({
    booking_id: booking.id,
    kind: "payment_failed",
    data: { code: intent.last_payment_error?.decline_code ?? intent.last_payment_error?.code ?? null },
  });
};

Deno.serve(async (request) => {
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      await request.text(),
      request.headers.get("Stripe-Signature") ?? "",
      Deno.env.get("STRIPE_PAYMENTS_WEBHOOK_SECRET") ?? "",
      undefined,
      cryptoProvider,
    );
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  const { data: seen } = await admin.from("stripe_events").select("id").eq("id", event.id).maybeSingle();

  if (seen) return Response.json({ received: true, duplicate: true });

  try {
    if (event.type === "payment_intent.succeeded") await handlePaid(event.data.object);

    if (event.type === "payment_intent.payment_failed") await handleFailed(event.data.object);
  } catch (error) {
    console.error(event.type, "failed", error instanceof Error ? error.message : error);

    return new Response("failed", { status: 500 });
  }

  await admin.from("stripe_events").insert({ id: event.id, type: event.type });

  return Response.json({ received: true });
});
