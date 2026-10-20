// A checkout's card charge that was never saved as a payment (the checkout crashed): what became of it, and giving
// it back. Each refund try gets a new key, as Stripe replays a failed request's result for a day.
import { admin } from "./admin.ts";
import { stripe } from "./stripe.ts";

const getMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** "charged": money taken and not given back; "settled": never charged, or already refunded. */
export const getUnsavedCharge = async (intentId: string) => {
  const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] });
  const charge = intent.latest_charge;
  const isRefunded = typeof charge === "object" && !!charge?.refunded;

  if (intent.status === "processing") return { intent, state: "processing" as const };

  return { intent, state: intent.status === "succeeded" && !isRefunded ? ("charged" as const) : ("settled" as const) };
};

export const settleUnsavedCharge = async (bookingId: string, intentId: string, outcome: string, message = "") => {
  const { error } = await admin.rpc("settle_unsaved_charge", { target: bookingId, intent: intentId, outcome, message });

  if (error) throw error;
};

/** Refunds it in full; a failure is counted and left for the next run, never thrown. */
export const giveBackUnsavedCharge = async (
  bookingId: string,
  intentId: string,
  isTransferred: boolean,
  failures: number,
) => {
  try {
    await stripe.refunds.create(
      {
        payment_intent: intentId,
        metadata: { booking_id: bookingId, reason: "unsaved_checkout" },
        ...(isTransferred ? { reverse_transfer: true } : {}),
      },
      { idempotencyKey: `checkout:${bookingId}:unsaved-refund:${intentId}:${failures}` },
    );

    await settleUnsavedCharge(bookingId, intentId, "refunded");
  } catch (error) {
    console.error("unsaved charge refund failed", bookingId, intentId, getMessage(error));
    await settleUnsavedCharge(bookingId, intentId, "failed", getMessage(error)).catch((noteError) =>
      console.error("unsaved charge failure not noted", bookingId, intentId, getMessage(noteError)),
    );
  }
};
