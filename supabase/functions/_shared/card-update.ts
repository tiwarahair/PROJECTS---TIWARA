import { admin } from "./admin.ts";
import { getCardLabel } from "./declines.ts";
import { stripe } from "./stripe.ts";

/** A card Stripe confirmed for this booking becomes its card for fees; false while Stripe hasn't confirmed one. */
export const saveCardUpdate = async (bookingId: string, intentId: string | null) => {
  if (!intentId) return false;

  const intent = await stripe.setupIntents.retrieve(intentId);

  if (intent.status !== "succeeded" || intent.metadata?.booking_id !== bookingId) return false;

  const paymentMethod = String(intent.payment_method);
  const { card } = await stripe.paymentMethods.retrieve(paymentMethod);

  const { error } = await admin.rpc("save_card_update", {
    target: bookingId,
    intent: intentId,
    payment_method: paymentMethod,
    label: getCardLabel(card?.brand, card?.last4),
  });

  if (error) throw error;

  return true;
};
