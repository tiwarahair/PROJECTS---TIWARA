// Run by cron every minute while money is due: settles each fee whose waive window has closed, finishes any
// cancellation whose refund failed after the booking was cancelled, and gives back card charges from crashed checkouts.
import { admin } from "../_shared/admin.ts";
import { settleFee } from "../_shared/fee-settlement.ts";
import type { FeeSettlement } from "../_shared/fee-settlement.ts";
import { refundCancellation } from "../_shared/refund.ts";
import { getUnsavedCharge, giveBackUnsavedCharge, settleUnsavedCharge } from "../_shared/unsaved-charge.ts";

const BATCH_SIZE = 10;

interface UnfinishedRefund {
  booking_id: string;
  payment_intent_id: string | null;
  amount_pence: number;
  cancelled_by: string;
}

interface UnsavedCharges {
  booking_id: string;
  intent_ids: string[];
  saved_intents: string[];
  refund_failures: number;
  held_at: string;
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
      // counted by refundCancellation; tried again later with a new key
      failed++;
      console.error("charge-fees refund failed", bookingId, getMessage(refundError));
    }
  }

  return { refunds: refunds.length, refundsFailed: failed };
};

// a crashed checkout's charge isn't the stylist's to keep: the booking was checked out another way, or is still due
const refundUnsavedCharges = async () => {
  const { data, error } = await admin.rpc("claim_unsaved_charges", { batch_size: BATCH_SIZE });

  if (error) throw error;

  const bookings = (data ?? []) as UnsavedCharges[];

  for (const {
    booking_id: bookingId,
    intent_ids: intentIds,
    saved_intents: saved,
    refund_failures: failures,
    held_at: heldAt,
  } of bookings) {
    for (const intentId of intentIds) {
      try {
        if (saved.includes(intentId)) {
          await settleUnsavedCharge(bookingId, intentId, "saved");
          continue;
        }

        const { intent, state } = await getUnsavedCharge(intentId);

        if (state === "charged") await giveBackUnsavedCharge(bookingId, intentId, !!intent.transfer_data, failures);

        if (state === "settled") await settleUnsavedCharge(bookingId, intentId, "not_charged");
      } catch (chargeError) {
        console.error("charge-fees unsaved charge failed", bookingId, intentId, getMessage(chargeError));
        await settleUnsavedCharge(bookingId, intentId, "failed", getMessage(chargeError)).catch(() => {});
      }
    }

    // only its own hold: a checkout that started after it stays held
    const { error: releaseError } = await admin
      .from("bookings")
      .update({ checkout_started_at: null })
      .eq("id", bookingId)
      .eq("checkout_started_at", heldAt);

    if (releaseError) throw releaseError;
  }

  return { unsaved: bookings.length };
};

Deno.serve(async (request) => {
  const secret = Deno.env.get("CRON_SECRET");

  if (!secret || request.headers.get("x-cron-secret") !== secret) return new Response("Forbidden", { status: 403 });

  try {
    return Response.json({ ...(await settleFees()), ...(await finishRefunds()), ...(await refundUnsavedCharges()) });
  } catch (error) {
    return new Response(getMessage(error), { status: 500 });
  }
});
