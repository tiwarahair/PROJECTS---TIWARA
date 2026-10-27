// Payout events from stylists' Stripe accounts (a "Connected accounts" event destination): keeps each payout's status, and once Stripe has reconciled an automatic payout, marks the payments and refunds it paid out.
import Stripe from "stripe";
import { admin } from "../_shared/admin.ts";
import { stripe } from "../_shared/stripe.ts";
import { isHandled, markHandled } from "../_shared/stripe-events.ts";

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const savePayout = async (account: string, payout: Stripe.Payout) => {
  const { error } = await admin.rpc("save_payout", { account, payout });

  if (error) throw error;
};

// each line on the stylist's account traced back to our payment intent (payments) or refund (refunds)
const getPayoutItems = async (account: string, payoutId: string) => {
  const intents: string[] = [];
  const refunds: string[] = [];

  for await (const line of stripe.balanceTransactions.list(
    {
      payout: payoutId,
      limit: 100,
      expand: ["data.source.source_transfer.source_transaction", "data.source.source_transfer_reversal"],
    },
    { stripeAccount: account },
  )) {
    const source = line.source;

    if (!source || typeof source === "string") continue;

    if (source.object === "charge" && source.source_transfer && typeof source.source_transfer !== "string") {
      const charge = source.source_transfer.source_transaction;

      if (charge && typeof charge !== "string" && typeof charge.payment_intent === "string")
        intents.push(charge.payment_intent);
    }

    if (
      source.object === "refund" &&
      source.source_transfer_reversal &&
      typeof source.source_transfer_reversal !== "string"
    ) {
      const { source_refund: sourceRefund, metadata } =
        source.source_transfer_reversal;

      // a reversal made by hand for a later transfer names its refund in metadata
      const refund = sourceRefund ?? metadata?.refund_id;

      if (refund) refunds.push(typeof refund === "string" ? refund : refund.id);
    }
  }

  return { intents, refunds };
};

Deno.serve(async (request) => {
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      await request.text(),
      request.headers.get("Stripe-Signature") ?? "",
      Deno.env.get("STRIPE_PAYOUTS_WEBHOOK_SECRET") ?? "",
      undefined,
      cryptoProvider,
    );
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  if (await isHandled(event.id)) return Response.json({ received: true, duplicate: true });

  try {
    if (event.account && event.type.startsWith("payout.")) {
      const payout = event.data.object as Stripe.Payout;

      await savePayout(event.account, payout);

      if (event.type === "payout.reconciliation_completed") {
        const { intents, refunds } = await getPayoutItems(event.account, payout.id);

        const { error } = await admin.rpc("link_payout", {
          stripe_payout: payout.id,
          intents,
          stripe_refunds: refunds,
        });

        if (error) throw error;
      }
    }
  } catch (error) {
    console.error(event.type, "failed", error instanceof Error ? error.message : error);

    return new Response("failed", { status: 500 });
  }

  await markHandled(event.id, event.type);

  return Response.json({ received: true });
});
