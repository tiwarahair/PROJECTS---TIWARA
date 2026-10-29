// Run by cron for card money we kept: sent on once the stylist's account can receive it, and a new stylist's once
// their appointment is over.
import type Stripe from "stripe";
import { admin } from "../_shared/admin.ts";
import { saveDestinationPayment } from "../_shared/card-payment.ts";
import { reverseLaterTransfer } from "../_shared/later-transfer.ts";
import { getStripeFee } from "../_shared/stripe-fee.ts";
import { getTransferKey } from "../_shared/stripe-keys.ts";
import { stripe } from "../_shared/stripe.ts";
import {
  getRefundsBefore,
  getUncountedRefunds,
  isLiveRefund,
  readCountedRefunds,
  toCountedMetadata,
} from "../_shared/uncounted-refunds.ts";

const BATCH_SIZE = 20;

interface PendingTransfer {
  payment_id: string;
  payment_intent_id: string;
  platform_fee_pence: number;
  fee_refunded_pence: number;
  stylist_account: string;
  transfer_failures: number;
}

const getRefunds = async (intentId: string) =>
  (await stripe.refunds.list({ payment_intent: intentId, limit: 100 })).data;

// a transfer an earlier try made but couldn't record
const findEarlierTransfer = async (group: string) => {
  const { data } = await stripe.transfers.list({ transfer_group: group, limit: 1 });

  return data[0] ?? null;
};

const getCounted = async ({ metadata, created }: Stripe.Transfer, intentId: string) =>
  readCountedRefunds(metadata) ?? getRefundsBefore(await getRefunds(intentId), created);

const makeTransfer = async ({
  payment_id: paymentId,
  payment_intent_id: intentId,
  platform_fee_pence: bookingFee,
  fee_refunded_pence: feeRefunded,
  stylist_account: account,
  transfer_failures: failures,
}: PendingTransfer) => {
  const group = `payment:${paymentId}`;
  const earlier = await findEarlierTransfer(group);

  if (earlier) return { transfer: earlier, counted: await getCounted(earlier, intentId) };

  const { latest_charge: charge } = await stripe.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] });

  if (!charge || typeof charge === "string") throw new Error(`${intentId} has no charge`);

  // what's refunded is read from the refunds themselves, so the ones counted here are known exactly
  const refunds = (await getRefunds(intentId)).filter(isLiveRefund);
  let refunded = 0;

  for (const { amount: refundAmount } of refunds) refunded += refundAmount;

  // whatever was refunded meanwhile stays with the client; our booking fee (unless it went back to the client) stays
  // with us, and Stripe's fee on the stylist's part is theirs
  const amount = charge.amount - refunded - (bookingFee - feeRefunded) - getStripeFee(charge.amount - bookingFee);
  const counted = refunds.map(({ id }) => id);

  if (amount <= 0) return { transfer: null, counted };

  const transfer = await stripe.transfers.create(
    // tied to the fee's own charge, so it's paid from that money
    {
      amount,
      currency: "gbp",
      destination: account,
      source_transaction: charge.id,
      transfer_group: group,
      metadata: { payment_id: paymentId, ...toCountedMetadata(counted) },
    },
    { idempotencyKey: getTransferKey(paymentId, failures) },
  );

  return { transfer, counted };
};

// the booking fee a free cancellation gave back, read now: it may have happened while the transfer was being sent
const getFeeRefunded = async (paymentId: string) => {
  const { data: payment, error } = await admin
    .from("payments")
    .select("booking_id, kind, platform_fee_pence")
    .eq("id", paymentId)
    .single();

  if (error) throw error;

  if (payment.kind !== "booking") return 0;

  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("cancellation")
    .eq("id", payment.booking_id)
    .single();

  if (bookingError) throw bookingError;

  return Math.min(Number(booking.cancellation?.fee_refund_pence ?? 0), payment.platform_fee_pence);
};

// a refund made while this was being sent found no transfer to take its part back from
const takeBackUncounted = async (paymentId: string, intentId: string, counted: string[]) => {
  const uncounted = getUncountedRefunds(await getRefunds(intentId), counted);
  const feeRefunded = uncounted.length ? await getFeeRefunded(paymentId) : 0;

  for (const refund of uncounted)
    await reverseLaterTransfer(
      intentId,
      refund,
      refund.metadata?.reason === "client_cancelled" ? Math.min(feeRefunded, refund.amount) : 0,
    );
};

const logPostCheckFailure = (paymentId: string) => (error: unknown) =>
  console.error("send-transfers refund check failed", paymentId, error instanceof Error ? error.message : error);

const sendTransfer = async (pending: PendingTransfer) => {
  const { transfer, counted } = await makeTransfer(pending);
  const { payment_id: paymentId, payment_intent_id: intentId } = pending;

  const { error } = await admin.rpc("mark_transfer_sent", { payment: paymentId, transfer: transfer?.id ?? null });

  if (error) throw error;

  if (transfer && typeof transfer.destination_payment === "string")
    await saveDestinationPayment(pending.payment_intent_id, transfer.destination_payment, pending.stylist_account);

  // the transfer is sent and recorded, so failing here mustn't count against it
  if (transfer) await takeBackUncounted(paymentId, intentId, counted).catch(logPostCheckFailure(paymentId));
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
