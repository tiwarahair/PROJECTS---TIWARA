// Checkout from Studio: completing it (with the saved card, a link or a recorded payment) and the balance afterwards.
import { FunctionsHttpError } from "@supabase/supabase-js";
import { notifyStudioWrite, SaveError } from "../studio-writes";
import { supabase } from "../supabase";
import { writeOrRefuse } from "./request";

const REFUSALS: Record<string, string> = {
  already_completed: "This booking is already checked out.",
  checkout_not_allowed: "This booking can’t be checked out yet.",
  invalid_lines: "Check the items and prices.",
  reason_required: "Add a reason for each price change.",
  method_not_allowed: "That payment method isn’t available for this booking.",
  card_over_agreed:
    "The saved card can’t be charged more than was agreed. Send a link or record the payment.",
  tip_too_high: "A tip on the saved card can be up to 25% of the price.",
  tip_not_allowed: "Payment links can’t include a tip.",
  no_contact_email: "There’s no email address to send the link to.",
  checkout_in_progress:
    "A card payment for this booking is already going through. Wait a moment, then check Past.",
  nothing_due: "Nothing is left to pay.",
  undo_not_allowed: "This checkout can’t be undone any more.",
  correction_not_allowed:
    "Payments can be corrected until the end of the month after they’re taken.",
  invalid_amount: "Check the amount and tip.",
  resend_not_allowed: "No resends left. Record the payment or cancel the link.",
  link_not_pending: "That link isn’t active any more.",
};

export interface CheckoutLineInput {
  name: string;
  subtitle: string;
  base_pence: number;
  adjustment_pence: number;
  reason: string;
}

export interface CheckoutInput {
  lines: CheckoutLineInput[];
  tipPence: number;
  method: "none" | "card" | "link" | "record";
  via: string;
}

export type CheckoutOutcome =
  | { outcome: "completed" }
  | { outcome: "declined"; hard: boolean; message: string };

const getRefusal = async (error: unknown) => {
  if (!(error instanceof FunctionsHttpError)) return null;

  const body = (await error.context.json().catch(() => ({}))) as {
    error?: string;
  };

  return REFUSALS[body.error ?? ""] ?? null;
};

/** Completes the checkout on the server, charging the saved card when that's the method. */
export const completeCheckout = async (
  bookingId: string,
  input: CheckoutInput,
) => {
  const { data, error } = await supabase.functions.invoke<CheckoutOutcome>(
    "studio-checkout",
    { body: { bookingId, ...input } },
  );

  const refusal = error ? await getRefusal(error) : null;

  if (refusal) throw new SaveError(refusal);

  if (error || !data) throw error ?? new Error("checkout failed");

  notifyStudioWrite();

  return data;
};

export const undoCheckout = (bookingId: string) =>
  writeOrRefuse(supabase.rpc("undo_checkout", { target: bookingId }), REFUSALS);

export const recordBalancePaid = (
  bookingId: string,
  via: string,
  tipPence: number,
) =>
  writeOrRefuse(
    supabase.rpc("record_balance_paid", {
      target: bookingId,
      via,
      tip: tipPence,
    }),
    REFUSALS,
  );

export const correctRecordedPayment = (
  paymentId: string,
  amountPence: number,
  via: string,
  tipPence: number,
) =>
  writeOrRefuse(
    supabase.rpc("correct_recorded_payment", {
      target: paymentId,
      amount: amountPence,
      via,
      tip: tipPence,
    }),
    REFUSALS,
  );

export const resendBalanceLink = (bookingId: string) =>
  writeOrRefuse(
    supabase.rpc("resend_balance_link", { target: bookingId }),
    REFUSALS,
  );

export const cancelBalanceLink = (bookingId: string) =>
  writeOrRefuse(
    supabase.rpc("cancel_balance_link", { target: bookingId }),
    REFUSALS,
  );
