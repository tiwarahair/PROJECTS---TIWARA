import { admin } from "./admin.ts";

/**  new stylist's card money stays with us until their appointment is over; send-transfers sends it on */
export const isPayoutHeld = async (account: string | null) => {
  if (!account) return false;

  const { data, error } = await admin.rpc("is_payout_held_for_account", {
    account,
  });

  if (error) throw error;

  return data === true;
};
