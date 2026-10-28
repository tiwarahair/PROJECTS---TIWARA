import type Stripe from "stripe";
import { admin } from "./admin.ts";
import { stripe } from "./stripe.ts";

interface RecordedDispute {
  id: string;
  stylist_account: string | null;
  transfer_pending: boolean;
  transfer_id: string | null;
  reversed_pence: number;
  is_held: boolean;
  reversal_failures: number;
  outcome: string | null;
}

const OPEN = ["needs_response", "under_review", "lost"];

const getMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const rpc = async (name: string, args: Record<string, unknown>) => {
  const { data, error } = await admin.rpc(name, args);

  if (error) throw error;

  return data;
};

const getFees = async (disputeId: string) => {
  const { balance_transactions: transactions } = await stripe.disputes.retrieve(disputeId, {
    expand: ["balance_transactions"],
  });

  let fees = 0;

  for (const { fee } of transactions) fees += fee;

  return fees;
};

// part of the charge, or sent on later by send-transfers
const getTransfer = ({ transfer }: Stripe.Charge, { transfer_id: transferId }: RecordedDispute) => {
  if (transfer && typeof transfer !== "string") return transfer;

  return transferId ? stripe.transfers.retrieve(transferId) : null;
};

const saveRecovery = (target: string, share: number, reversal: Stripe.TransferReversal | null, held = false) =>
  rpc("save_dispute_recovery", {
    target,
    share,
    reversed: reversal ? share : 0,
    reversal: reversal?.id ?? null,
    held,
  });

const recover = async ({ id, amount, charge: chargeId }: Stripe.Dispute, saved: RecordedDispute) => {
  const charge = await stripe.charges.retrieve(String(chargeId), {
    expand: ["transfer"],
  });
  const transfer = await getTransfer(charge, saved);
  const { amount: paid, amount_refunded: refunded, application_fee_amount: ourFee, metadata } = charge;

  // our fee is ours to lose (on a charge we kept, what it would have been); a debt it paid off for the stylist goes
  // back to the bank too
  const received =
    paid - (ourFee ?? Number(metadata.kept_pence || 0)) + Number(metadata.recovered_pence || 0) - refunded;
  const left = transfer ? transfer.amount - transfer.amount_reversed : received;
  const share = Math.max(0, Math.min(amount, received, left));

  if (!transfer && saved.transfer_pending) return saveRecovery(saved.id, share, null, share > 0);

  // the dispute card disputes before the transfer exists: failing makes Stripe send the event again
  if (!transfer) throw new Error("transfer_not_ready");

  if (!share) return saveRecovery(saved.id, 0, null);

  try {
    // one an earlier try made but couldn't save
    const { data: earlier } = await stripe.transfers.listReversals(transfer.id, { limit: 100 });

    const reversal =
      earlier.find(({ metadata }) => metadata?.dispute_id === id) ??
      (await stripe.transfers.createReversal(
        transfer.id,
        { amount: share, metadata: { dispute_id: id } },
        { idempotencyKey: `dispute:${id}:reversal:${saved.reversal_failures}` },
      ));

    await saveRecovery(saved.id, share, reversal);
  } catch (error) {
    console.error("dispute reversal failed", id, getMessage(error));
    await rpc("note_reversal_failure", {
      target: saved.id,
      message: getMessage(error),
    });
  }
};

// their share, and any of Stripe's fee already taken from them that Stripe gave back to us
const giveBack = async (
  { id, charge }: Stripe.Dispute,
  { id: target, reversed_pence: reversed, stylist_account: account }: RecordedDispute,
  feeReturned: number,
) => {
  const returned = reversed + feeReturned;

  if (!returned || !account) return rpc("settle_won_dispute", { target, returned: 0, fee_returned: 0, transfer: null });

  const transfer = await stripe.transfers.create(
    {
      amount: returned,
      currency: "gbp",
      destination: account,
      // paid from the reinstated charge, so it doesn't wait for our balance
      source_transaction: String(charge),
      metadata: { dispute_id: id },
    },
    { idempotencyKey: `dispute:${id}:return:${returned}` },
  );

  await rpc("settle_won_dispute", { target, returned, fee_returned: feeReturned, transfer: transfer.id });
};

export const handleDispute = async (dispute: Stripe.Dispute) => {
  const { id, status } = dispute;
  const saved = (await rpc("record_dispute", { dispute })) as RecordedDispute;
  const { outcome } = saved;

  // another environment sharing the sandbox
  if (!saved.stylist_account) return;

  if (OPEN.includes(status) && !saved.reversed_pence && !saved.is_held && outcome !== "won")
    await recover(dispute, saved);

  const feeOverpaid = Number(await rpc("save_dispute_fees", { target: saved.id, fees: await getFees(id) }));

  if (status === "won" && outcome !== "won") await giveBack(dispute, saved, feeOverpaid);

  if (status === "lost" && outcome !== "lost" && outcome !== "accepted")
    await rpc("settle_dispute", {
      target: saved.id,
      won: false,
      returned: 0,
      transfer: null,
    });
};
