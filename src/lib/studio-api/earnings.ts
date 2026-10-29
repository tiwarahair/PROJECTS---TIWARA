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

const DISPUTE_SELECT = `id, amount_pence, reason, status, outcome, respond_by, returned_pence,
  booking:bookings(id, starts_at, snapshot, contact)`;

const selectDisputes = (stylistId: string) =>
  supabase
    .from("disputes")
    .select(DISPUTE_SELECT)
    .eq("stylist_id", stylistId)
    .is("outcome", null);

export type EarningsDispute = NonNullable<
  Awaited<ReturnType<typeof selectDisputes>>["data"]
>[number];

export interface StudioEarnings {
  lines: LedgerRow[];
  payouts: PayoutRow[];
  balance: StripeBalance | null;
  disputes: EarningsDispute[];
}

// the ledger still shows if Stripe can't be reached; only the balance card says it couldn't load
const fetchBalance = async () => {
  const { data, error } =
    await supabase.functions.invoke<StripeBalance>("studio-balance");

  return error || !data ? null : data;
};

export const fetchStudioEarnings = async (
  stylistId: string,
): Promise<StudioEarnings> => {
  const [lines, payouts, balance, disputes] = await Promise.all([
    check(supabase.rpc("get_stylist_ledger", { target_stylist: stylistId })),
    check(
      supabase
        .from("payouts")
        .select("*")
        .eq("stylist_id", stylistId)
        .order("created_at", { ascending: false }),
    ),
    fetchBalance(),
    check(selectDisputes(stylistId)),
  ]);

  return {
    lines: lines ?? [],
    payouts: payouts ?? [],
    balance,
    disputes: disputes ?? [],
  };
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
