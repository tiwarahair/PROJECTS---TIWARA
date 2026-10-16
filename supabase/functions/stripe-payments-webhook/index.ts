// Stripe's payment events (classic snapshot events, their own endpoint and secret), each handled once.
import Stripe from "npm:stripe@22.6.2";
import { stripe } from "../_shared/stripe.ts";
import { isHandled, markHandled } from "../_shared/stripe-events.ts";
import { onPaymentFailed, onPaymentSucceeded } from "./handlers.ts";

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
    if (event.type === "payment_intent.succeeded") await onPaymentSucceeded(event.data.object);

    if (event.type === "payment_intent.payment_failed") await onPaymentFailed(event.data.object);
  } catch (error) {
    console.error(event.type, "failed", error instanceof Error ? error.message : error);

    return new Response("failed", { status: 500 });
  }

  await markHandled(event.id, event.type);

  return Response.json({ received: true });
});
