// Fees and refunds from Studio: waive, record, retry, resend the payment link, refund.
import { SaveError } from "../studio-writes";
import { supabase } from "../supabase";
import { invokeStudio, write } from "./request";

/** The booking's current fee is waived. */
export const waiveFee = (bookingId: string) =>
  write(supabase.rpc("waive_fee", { target_booking: bookingId }));

export const recordFeePaid = (bookingId: string) =>
  write(
    supabase.rpc("record_fee_paid", {
      target_booking: bookingId,
      method: "other",
    }),
  );

/** Emails the client a fresh link to pay the booking's unpaid fee (twice at most). */
export const resendPaymentLink = (bookingId: string) =>
  write(supabase.rpc("resend_payment_link", { target_booking: bookingId }));

export interface FeeRetry {
  outcome: "paid" | "unpaid";
  declineMessage: string | null;
}

/** Charges a declined fee again; throws SaveError when it can't be retried yet. */
export const retryFee = async (bookingId: string) => {
  const data = await invokeStudio<FeeRetry>(
    "studio-fee",
    { bookingId },
    { 409: () => new SaveError("You can retry 24 hours after the last try.") },
  );

  if (!data) throw new Error("retry failed");

  return data;
};

export class SecondFactorNeeded extends Error {}

/** A discretionary refund from Studio (needs a 2FA code from the last 30 days); returns the pence refunded. */
export const refundBookingPayment = async (
  bookingId: string,
  amountPence: number,
  reason: string,
) => {
  const data = await invokeStudio<{ refunded_pence: number }>(
    "studio-refund",
    { bookingId, amountPence, reason },
    {
      403: () => new SecondFactorNeeded(),
      409: () => new SaveError("That’s more than can be refunded."),
    },
  );

  if (!data) throw new Error("refund failed");

  return data.refunded_pence;
};
