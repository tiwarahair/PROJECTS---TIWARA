// A booking's fee and refunds from the database → the flags Past shows and acts on.
import type { StudioBookingRow } from "../../../lib/studio-api";
import { formatMoney } from "../../../utils/money";
import type { PastRecord } from "../core/types";

type FeeRow = StudioBookingRow["booking_fees"][number];

// the automatic charge, then two retries
const MAX_TRIES = 3;

export const toPounds = (pence: number) => pence / 100;

const formatPence = (pence: number) =>
  formatMoney(toPounds(pence), { pence: "always" });

/** The booking's current fee (a voided one belongs to an undone no-show). */
export const getLatestFee = ({ booking_fees: fees }: StudioBookingRow) =>
  fees
    .filter(({ status }) => status !== "void")
    .sort(
      (first, second) =>
        Date.parse(second.created_at) - Date.parse(first.created_at),
    )[0];

export const getRefunded = ({ refunds }: StudioBookingRow) => {
  let total = 0;

  for (const { amount_pence: amount } of refunds) total += amount;

  return total;
};

const getUnpaidFlags = (fee: FeeRow): Partial<PastRecord> => ({
  feeKept: true,
  feeUnpaid: true,
  feeTries: fee.hard_decline ? 0 : Math.max(0, MAX_TRIES - fee.tries),
  feeCharge: toPounds(fee.charge_pence),
  feeCard: fee.card_label ?? undefined,
  meta: "Fee unpaid",
});

const getStatusFlags = (fee: FeeRow): Partial<PastRecord> => {
  if (fee.status === "unpaid") return getUnpaidFlags(fee);

  if (fee.status === "pending" || fee.status === "charging")
    return { feeKept: true, feePending: true, meta: "Fee pending" };

  if (fee.status === "paid") return { feeKept: true, meta: "Fee paid" };

  if (fee.status === "paid_offline")
    return { feeKept: true, meta: "Fee recorded" };

  return { feeKept: true, meta: "Fee kept" };
};

/** Past's fee flags; nothing for a no-charge settlement, which only refunds. */
export const getFeeFlags = (fee: FeeRow | undefined): Partial<PastRecord> => {
  if (!fee?.amount_pence) return {};

  const base = {
    feeLabel: formatPence(fee.amount_pence),
    at: Date.parse(fee.created_at),
  };

  if (fee.waived_at) return { ...base, waived: true, meta: "Fee waived" };

  return { ...base, ...getStatusFlags(fee) };
};

/** "£30.00 refunded." now, or "£30.00 back to the client on settlement." while it waits. */
export const getRefundNote = (refunded: number, fee: FeeRow | undefined) => {
  if (refunded) return ` ${formatPence(refunded)} refunded.`;

  if (fee?.refund_pence && !fee.waived_at)
    return ` ${formatPence(fee.refund_pence)} goes back to the client when the fee settles.`;

  return "";
};
