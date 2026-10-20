// A checkout's card charge on the client's saved card, and the refund when they paid more than the final price.
import Stripe from "npm:stripe@22.6.2";
import { getCardLabel, isHardDecline } from "../_shared/declines.ts";
import { getRefundable } from "../_shared/refundable.ts";
import { getStripeFee } from "../_shared/stripe-fee.ts";
import { getCheckoutChargeKey } from "../_shared/stripe-keys.ts";
import { stripe } from "../_shared/stripe.ts";

export interface CheckoutQuote {
  id: string;
  ref: string;
  service_name: string;
  final_pence: number;
  tip_pence: number;
  charge_pence: number;
  refund_pence: number;
  customer_id: string | null;
  payment_method_id: string | null;
  payment_intent_id: string | null;
  stylist_account: string | null;
  stylist_can_receive: boolean;
  tries: number;
  checkout_intent_id: string | null;
  card_intents: string[];
  booking_fee_pence: number;
  lowered_refunds: number;
}

/** A card charge from an earlier try that went through but was never saved. */
export const findEarlierCharge = async ({ checkout_intent_id: intentId, card_intents: saved }: CheckoutQuote) => {
  if (!intentId || saved.includes(intentId)) return null;

  const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] });
  const charge = intent.latest_charge;

  // one given back because the booking was checked out another way doesn't count
  return intent.status === "succeeded" && !(typeof charge === "object" && charge?.refunded) ? intent : null;
};

/** Whether an earlier charge is the one this checkout would make. */
export const isSameCharge = (intent: Stripe.PaymentIntent, { charge_pence: amount, tip_pence: tip }: CheckoutQuote) =>
  intent.amount === amount && intent.metadata.tip_pence === String(tip);

interface CardPaid {
  paid: true;
  payment_intent_id: string;
  charge_pence: number;
  transfer_pending: boolean;
  card_label: string | null;
}

interface CardDeclined {
  paid: false;
  hard: boolean;
  message: string;
  card_label: string | null;
}

const getCard = async (paymentMethodId: string) => {
  const { card } = await stripe.paymentMethods.retrieve(paymentMethodId);

  return getCardLabel(card?.brand, card?.last4);
};

export const chargeSavedCard = async (
  quote: CheckoutQuote,
  earlier: Stripe.PaymentIntent | null,
  saveIntent: (intentId: string) => Promise<void>,
): Promise<CardPaid | CardDeclined> => {
  const paymentMethod = quote.payment_method_id as string;
  const cardLabel = await getCard(paymentMethod);
  const canTransfer = !!quote.stylist_account && quote.stylist_can_receive;

  // a try that charged, then failed before saving: keep that payment rather than charge again
  if (earlier)
    return {
      paid: true,
      payment_intent_id: earlier.id,
      charge_pence: earlier.amount,
      transfer_pending: !earlier.transfer_data,
      card_label: cardLabel,
    };

  try {
    const created = await stripe.paymentIntents.create(
      {
        amount: quote.charge_pence,
        currency: "gbp",
        customer: quote.customer_id ?? undefined,
        payment_method: paymentMethod,
        description: `${quote.ref}: ${quote.service_name} balance`,
        metadata: {
          kind: "checkout",
          booking_id: quote.id,
          checkout_booking: quote.id,
          tip_pence: String(quote.tip_pence),
        },
        ...(canTransfer
          ? {
              application_fee_amount: getStripeFee(quote.charge_pence),
              transfer_data: { destination: quote.stylist_account as string },
            }
          : {}),
      },
      { idempotencyKey: getCheckoutChargeKey(quote.id, quote.tries, quote.charge_pence, quote.tip_pence) },
    );

    await saveIntent(created.id);

    const intent = await stripe.paymentIntents.confirm(created.id, { off_session: true });

    return {
      paid: true,
      payment_intent_id: intent.id,
      charge_pence: intent.amount,
      transfer_pending: !canTransfer,
      card_label: cardLabel,
    };
  } catch (error) {
    if (!(error instanceof Stripe.errors.StripeCardError)) throw error;

    const code = error.decline_code ?? error.code;

    // the bank wants the client there to approve it, which a saved-card charge can't do
    return {
      paid: false,
      hard: isHardDecline(code) || code === "authentication_required",
      message: error.message,
      card_label: cardLabel,
    };
  }
};

/** Gives back what the client paid over the final price; the stylist's card fee stays paid. */
export const refundOverpaid = async ({
  id,
  refund_pence: amount,
  payment_intent_id: intentId,
  booking_fee_pence: bookingFee,
  lowered_refunds: saved,
}: CheckoutQuote) => {
  if (!amount || !intentId) return { refund_pence: 0 };

  // one made by an earlier try that failed before saving it
  const { data: earlier } = await stripe.refunds.list({ payment_intent: intentId, limit: 100 });

  const made = earlier.filter(
    ({ metadata, status }) => metadata?.reason === "price_lowered" && status !== "failed" && status !== "canceled",
  );

  if (made.length > saved) return { refund_pence: made[0].amount, refund_id: made[0].id };

  // the booking fee is never part of it
  const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] });
  const refundAmount = Math.min(amount, getRefundable(intent.latest_charge) - bookingFee);

  if (refundAmount <= 0) return { refund_pence: 0 };

  const refund = await stripe.refunds.create(
    {
      payment_intent: intentId,
      amount: refundAmount,
      metadata: { booking_id: id, reason: "price_lowered" },
      ...(intent.transfer_data ? { reverse_transfer: true } : {}),
    },
    { idempotencyKey: `checkout:${id}:price-lowered-refund:${saved}:${refundAmount}` },
  );

  return { refund_pence: refundAmount, refund_id: refund.id };
};

/** Gives back in full a card charge that was never saved, or one made while the booking was checked out another way. */
export const refundCharge = (id: string, intentId: string, isTransferred: boolean) =>
  stripe.refunds.create(
    {
      payment_intent: intentId,
      metadata: { booking_id: id, reason: "unsaved_checkout" },
      ...(isTransferred ? { reverse_transfer: true } : {}),
    },
    { idempotencyKey: `checkout:${id}:unsaved-refund:${intentId}` },
  );
