// Fees and refunds from Studio: waive, record, retry, resend the payment link, refund.
import { FunctionsHttpError } from "@supabase/supabase-js";
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
  hardDecline: boolean;
}

const RETRY_REFUSALS: Record<string, string> = {
  too_soon: "You can retry 24 hours after the last try.",
  no_retries_left:
    "No retries left. Send a payment link or record the payment instead.",
  hard_decline:
    "This card can’t be charged again. Send a payment link or record the payment instead.",
  retry_not_allowed: "This fee can’t be retried now.",
};

const getRetryRefusal = async (error: FunctionsHttpError) => {
  const body = (await error.context.json().catch(() => ({}))) as {
    error?: string;
  };

  return new SaveError(
    RETRY_REFUSALS[body.error ?? ""] ?? RETRY_REFUSALS.retry_not_allowed,
  );
};

/** Charges a declined fee again; throws SaveError saying why when it can't be retried. */
export const retryFee = async (bookingId: string) => {
  const data = await invokeStudio<FeeRetry>("studio-fee", { bookingId }).catch(
    async (error: unknown) => {
      if (error instanceof FunctionsHttpError && error.context.status === 409)
        throw await getRetryRefusal(error);

      throw error;
    },
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
