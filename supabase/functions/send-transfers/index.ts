// Run by cron while fees wait for a stylist's account: sends each one on once the account can receive money.
import { admin } from "../_shared/admin.ts";
import { saveDestinationPayment } from "../_shared/card-payment.ts";
import { getRefundable } from "../_shared/refundable.ts";
import { getStripeFee } from "../_shared/stripe-fee.ts";
import { getTransferKey } from "../_shared/stripe-keys.ts";
import { stripe } from "../_shared/stripe.ts";

const BATCH_SIZE = 20;

interface PendingTransfer {
  payment_id: string;
  payment_intent_id: string;
  stylist_account: string;
  transfer_failures: number;
}

// a transfer an earlier try made but couldn't record
const findEarlierTransfer = async (group: string) => {
  const { data } = await stripe.transfers.list({ transfer_group: group, limit: 1 });

  return data[0] ?? null;
};

const makeTransfer = async ({ payment_id: paymentId, payment_intent_id: intentId, stylist_account: account, transfer_failures: failures }: PendingTransfer) => {
  const group = `payment:${paymentId}`;
  const earlier = await findEarlierTransfer(group);

  if (earlier) return earlier;

  const { latest_charge: charge } = await stripe.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] });

  if (!charge || typeof charge === "string") throw new Error(`${intentId} has no charge`);

  // whatever was refunded meanwhile stays with the client, and Stripe's fee is the stylist's
  const amount = getRefundable(charge) - getStripeFee(charge.amount);

  if (amount <= 0) return null;

  return stripe.transfers.create(
    // tied to the fee's own charge, so it's paid from that money
    { amount, currency: "gbp", destination: account, source_transaction: charge.id, transfer_group: group, metadata: { payment_id: paymentId } },
    { idempotencyKey: getTransferKey(paymentId, failures) },
  );
};

const sendTransfer = async (pending: PendingTransfer) => {
  const transfer = await makeTransfer(pending);
  const { payment_id: paymentId } = pending;

  const { error } = await admin.rpc("mark_transfer_sent", { payment: paymentId, transfer: transfer?.id ?? null });

  if (error) throw error;

  if (transfer && typeof transfer.destination_payment === "string")
    await saveDestinationPayment(pending.payment_intent_id, transfer.destination_payment, pending.stylist_account);
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
      const message = transferError instanceof Error ? transferError.message : String(transferError);

      console.error("send-transfers failed", transfer.payment_id, message);
      await admin.rpc("note_transfer_failure", { payment: transfer.payment_id, message });
    }
  }

  return Response.json({ sent: pending.length - failed, failed });
});
