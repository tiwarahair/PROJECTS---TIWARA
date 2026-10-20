// Studio → Earnings: the stylist's money lines, payouts and live Stripe balance, and refunds they hand back themselves.
import type { Database } from "../../types/database";
import { supabase } from "../supabase";
import { check, writeOrRefuse } from "./request";

type GeneratedLedgerRow =
  Database["public"]["Functions"]["get_stylist_ledger"]["Returns"][number];

export interface LedgerRow extends Omit<
  GeneratedLedgerRow,
  "card_fee_pence" | "payout_id" | "note"
> {
  card_fee_pence: number | null;
  payout_id: string | null;
  note: string | null;
}

export type PayoutRow = Database["public"]["Tables"]["payouts"]["Row"];

export interface StripeBalance {
  available_pence: number;
  pending_pence: number;
  next_payout: string | null;
}

export interface StudioEarnings {
  lines: LedgerRow[];
  payouts: PayoutRow[];
  balance: StripeBalance;
}

const NO_BALANCE: StripeBalance = {
  available_pence: 0,
  pending_pence: 0,
  next_payout: null,
};

// the ledger still shows if Stripe can't be reached; only the balance card goes blank
const fetchBalance = async () => {
  const { data, error } =
    await supabase.functions.invoke<StripeBalance>("studio-balance");

  return error || !data ? NO_BALANCE : data;
};

export const fetchStudioEarnings = async (
  stylistId: string,
): Promise<StudioEarnings> => {
  const [lines, payouts, balance] = await Promise.all([
    check(supabase.rpc("get_stylist_ledger", { target_stylist: stylistId })),
    check(
      supabase
        .from("payouts")
        .select("*")
        .eq("stylist_id", stylistId)
        .order("created_at", { ascending: false }),
    ),
    fetchBalance(),
  ]);

  return { lines: lines ?? [], payouts: payouts ?? [], balance };
};

/** Money the stylist gave back themselves (cash, bank transfer, card reader); never more than they recorded. */
export const recordRefund = (
  bookingId: string,
  amountPence: number,
  reason: string,
) =>
  writeOrRefuse(
    supabase.rpc("record_refund", {
      target: bookingId,
      amount: amountPence,
      reason,
    }),
    { more_than_refundable: "That’s more than was paid outside the app." },
  );
