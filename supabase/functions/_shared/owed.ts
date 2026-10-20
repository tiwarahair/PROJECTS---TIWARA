import { admin } from "./admin.ts";
import { stripe } from "./stripe.ts";

export const getRecovery = async (account: string | null, room: number) => {
  if (!account || room <= 0) return 0;

  const { data, error } = await admin.rpc("get_owed_pence", { account });

  if (error) throw error;

  return Math.min(Number(data ?? 0), room);
};

export const settleRecovery = async ({
  id,
  metadata,
  latest_charge: charge,
}: {
  id: string;
  metadata: Record<string, string>;
  latest_charge: string | { id: string } | null;
}) => {
  const recovered = Number(metadata.recovered_pence ?? 0);
  const account = metadata.stylist_account;

  if (!recovered || !account) return;

  const { data: excess, error } = await admin.rpc("apply_recovery", {
    account,
    intent: id,
    recovered,
    direct: metadata.kind === "debt",
  });

  if (error) throw error;

  // two payments at once can both carry the same debt
  if (Number(excess) > 0)
    await stripe.transfers.create(
      {
        amount: Number(excess),
        currency: "gbp",
        destination: account,
        metadata: { payment_intent: id },
        ...(charge ? { source_transaction: typeof charge === "string" ? charge : charge.id } : {}),
      },
      { idempotencyKey: `recovery:${id}:excess` },
    );
};
