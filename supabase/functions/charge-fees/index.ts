// Run by cron every minute while money is due: settles each fee whose waive window has closed, and finishes any
// cancellation whose refund failed after the booking was cancelled.
import { admin } from "../_shared/admin.ts";
import { settleFee } from "../_shared/fee-settlement.ts";
import type { FeeSettlement } from "../_shared/fee-settlement.ts";
import { refundCancellation } from "../_shared/refund.ts";

const BATCH_SIZE = 10;

interface UnfinishedRefund {
  booking_id: string;
  payment_intent_id: string | null;
  amount_pence: number;
  cancelled_by: string;
}

const getMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const settleFees = async () => {
  const { data, error } = await admin.rpc("claim_due_fees", { batch_size: BATCH_SIZE });

  if (error) throw error;

  const fees = (data ?? []) as FeeSettlement[];
  let failed = 0;

  for (const fee of fees) {
    try {
      await settleFee(fee);
    } catch (settleError) {
      // left claimed; the next run after 15 minutes tries it again
      failed++;
      console.error("charge-fees failed", fee.id, getMessage(settleError));
      await admin.rpc("note_settlement_failure", { target: fee.id, message: getMessage(settleError) });
    }
  }

  return { claimed: fees.length, failed };
};

const finishRefunds = async () => {
  const { data, error } = await admin.rpc("get_unfinished_refunds", { batch_size: BATCH_SIZE });

  if (error) throw error;

  const refunds = (data ?? []) as UnfinishedRefund[];
  let failed = 0;

  for (const { booking_id: bookingId, payment_intent_id: paymentIntentId, amount_pence: amount, cancelled_by: by } of refunds) {
    try {
      await refundCancellation({
        bookingId,
        paymentIntentId,
        amount,
        reason: by === "stylist" ? "stylist_cancelled" : "client_cancelled",
      });
    } catch (refundError) {
      failed++;
      console.error("charge-fees refund failed", bookingId, getMessage(refundError));
    }
  }

  return { refunds: refunds.length, refundsFailed: failed };
};

Deno.serve(async (request) => {
  const secret = Deno.env.get("CRON_SECRET");

  if (!secret || request.headers.get("x-cron-secret") !== secret) return new Response("Forbidden", { status: 403 });

  try {
    return Response.json({ ...(await settleFees()), ...(await finishRefunds()) });
  } catch (error) {
    return new Response(getMessage(error), { status: 500 });
  }
});
