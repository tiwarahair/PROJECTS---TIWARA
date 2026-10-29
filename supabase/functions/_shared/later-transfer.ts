import { admin } from "./admin.ts";
import { getReversalAmount } from "./reversal-amount.ts";
import { stripe } from "./stripe.ts";

interface MadeRefund {
  id: string;
  amount: number;
}

const getLaterTransfer = async (intentId: string) => {
  const { data, error } = await admin
    .from("payments")
    .select("booking_id, stripe_transfer_id")
    .eq("stripe_payment_intent_id", intentId)
    .not("stripe_transfer_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
};

const getReversed = async (transferId: string, refundId: string, stylistPart: number) => {
  const { data: reversals } = await stripe.transfers.listReversals(transferId, { limit: 100 });
  const earlier = reversals.find(({ metadata }) => metadata?.refund_id === refundId);

  if (earlier) return earlier.amount;

  const { amount: sent, amount_reversed: reversed } = await stripe.transfers.retrieve(transferId);
  const reversal = getReversalAmount({ refunded: stylistPart, transferLeft: sent - reversed });

  if (reversal <= 0) return 0;

  await stripe.transfers.createReversal(
    transferId,
    { amount: reversal, metadata: { refund_id: refundId } },
    { idempotencyKey: `later-transfer-reversal:${refundId}` },
  );

  return reversal;
};

const takeBack = async (intentId: string, { id: refundId, amount }: MadeRefund, ours: number) => {
  const payment = await getLaterTransfer(intentId);

  if (!payment?.stripe_transfer_id) return;

  const stylistPart = amount - ours;
  const reversed = await getReversed(payment.stripe_transfer_id, refundId, stylistPart);

  if (stylistPart <= reversed) return;

  const { error } = await admin.rpc("save_refund_debt", {
    refund: refundId,
    booking: payment.booking_id,
    amount: stylistPart - reversed,
  });

  if (error) throw error;
};

/**
 * A payment sent on to the stylist by send-transfers (held, or their account couldn't receive yet) has no
 * transfer_data, so reverse_transfer does nothing: the refund is taken back from that transfer instead, less any part
 * of it that's ours to give back (`ours`). What's left of the transfer can be too little: the rest is owed by the
 * stylist. Once per refund, so a retry doesn't take it twice. It never throws: the refund is already made, and failing
 * here would leave it unrecorded (or a checkout's charge unfinished).
 */
export const reverseLaterTransfer = async (intentId: string, refund: MadeRefund, ours = 0) => {
  try {
    await takeBack(intentId, refund, ours);
  } catch (error) {
    console.error("later transfer reversal failed", refund.id, error instanceof Error ? error.message : error);
  }
};
