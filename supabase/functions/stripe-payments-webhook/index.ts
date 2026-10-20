import Stripe from "npm:stripe@22.6.2";
import { saveCardPayment } from "../_shared/card-payment.ts";
import { settleRecovery } from "../_shared/owed.ts";
import { stripe } from "../_shared/stripe.ts";
import { isHandled, markHandled } from "../_shared/stripe-events.ts";
import { onDispute, onPaymentFailed, onPaymentSucceeded, onRefundCreated } from "./handlers.ts";

const cryptoProvider = Stripe.createSubtleCryptoProvider();

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

  if (await isHandled(event.id)) return Response.json({ received: true, duplicate: true });

  try {
    // a payment refunded straight away (slot taken, no longer needed) gives our fee back, so recovers nothing
    const isRefunded = event.type === "payment_intent.succeeded" && (await onPaymentSucceeded(event.data.object));

    // any card payment that went to a stylist: when its money becomes available to them
    if (event.type === "payment_intent.succeeded" && event.data.object.transfer_data && event.data.object.latest_charge)
      await saveCardPayment(event.data.object.id, String(event.data.object.latest_charge));

    if (event.type === "payment_intent.succeeded" && !isRefunded) await settleRecovery(event.data.object);

    if (event.type === "payment_intent.payment_failed") await onPaymentFailed(event.data.object);

    if (event.type === "refund.created") await onRefundCreated(event.data.object);

    if (event.type.startsWith("charge.dispute.")) await onDispute(event.data.object as Stripe.Dispute);
  } catch (error) {
    console.error(event.type, "failed", error instanceof Error ? error.message : error);

    return new Response("failed", { status: 500 });
  }

  await markHandled(event.id, event.type);

  return Response.json({ received: true });
});
