import { admin } from "./admin.ts";
import { getReversalAmount } from "./reversal-amount.ts";
import { stripe } from "./stripe.ts";

interface MadeRefund {
  id: string;
  amount: number;
}

const getLaterTransferId = async (intentId: string) => {
  const { data, error } = await admin
    .from("payments")
    .select("stripe_transfer_id")
    .eq("stripe_payment_intent_id", intentId)
    .not("stripe_transfer_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data?.stripe_transfer_id ?? null;
};

const takeBack = async (
  intentId: string,
  { id: refundId, amount }: MadeRefund,
) => {
  const transferId = await getLaterTransferId(intentId);

  if (!transferId) return;

  const { data: reversals } = await stripe.transfers.listReversals(transferId, {
    limit: 100,
  });

  if (reversals.some(({ metadata }) => metadata?.refund_id === refundId))
    return;

  const { amount: sent, amount_reversed: reversed } =
    await stripe.transfers.retrieve(transferId);

  const reversal = getReversalAmount({
    refunded: amount,
    transferLeft: sent - reversed,
  });

  if (reversal <= 0) return;

  await stripe.transfers.createReversal(
    transferId,
    { amount: reversal, metadata: { refund_id: refundId } },
    { idempotencyKey: `later-transfer-reversal:${refundId}` },
  );
};

/**
 * A payment sent on to the stylist by send-transfers (held, or their account couldn't receive yet) has no
 * transfer_data, so reverse_transfer does nothing: the refund is taken back from that transfer instead.
 * Once per refund, so a retry doesn't take it twice. It never throws: the refund is already made, and failing here
 * would leave it unrecorded (or a checkout's charge unfinished).
 */
export const reverseLaterTransfer = async (
  intentId: string,
  refund: MadeRefund,
) => {
  try {
    await takeBack(intentId, refund);
  } catch (error) {
    console.error(
      "later transfer reversal failed",
      refund.id,
      error instanceof Error ? error.message : error,
    );
  }
};
