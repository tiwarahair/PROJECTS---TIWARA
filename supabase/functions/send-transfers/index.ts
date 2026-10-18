// Run by cron while fees wait for a stylist's account: sends each one on once the account can receive money.
import { admin } from "../_shared/admin.ts";
import { stripe } from "../_shared/stripe.ts";

const BATCH_SIZE = 20;

interface PendingTransfer {
  payment_id: string;
  payment_intent_id: string;
  stylist_account: string;
}

const sendTransfer = async ({ payment_id: paymentId, payment_intent_id: intentId, stylist_account: account }: PendingTransfer) => {
  const { latest_charge: charge } = await stripe.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] });

  if (!charge || typeof charge === "string") throw new Error(`${intentId} has no charge`);

  // whatever was refunded from the fee meanwhile stays with the client, not the stylist
  const amount = charge.amount - charge.amount_refunded;

  const transfer =
    amount > 0
      ? await stripe.transfers.create(
          // tied to the fee's own charge, so it's paid from that money
          { amount, currency: "gbp", destination: account, source_transaction: charge.id, metadata: { payment_id: paymentId } },
          { idempotencyKey: `fee-transfer:${paymentId}` },
        )
      : null;

  const { error } = await admin.rpc("mark_transfer_sent", { payment: paymentId, transfer: transfer?.id ?? null });

  if (error) throw error;
};

Deno.serve(async (request) => {
  const secret = Deno.env.get("CRON_SECRET");

  if (!secret || request.headers.get("x-cron-secret") !== secret) return new Response("Forbidden", { status: 403 });

  const { data, error } = await admin.rpc("claim_pending_transfers", { batch_size: BATCH_SIZE });

  if (error) return new Response(error.message, { status: 500 });

  const pending = (data ?? []) as PendingTransfer[];
  let failed = 0;

  for (const transfer of pending) {
    try {
      await sendTransfer(transfer);
    } catch (transferError) {
      failed++;
      console.error("send-transfers failed", transfer.payment_id, transferError instanceof Error ? transferError.message : transferError);
    }
  }

  return Response.json({ sent: pending.length - failed, failed });
});
