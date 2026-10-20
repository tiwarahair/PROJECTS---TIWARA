// A checkout's card charge on the client's saved card, and the refund when they paid more than the final price.
import Stripe from "npm:stripe@22.6.2";
import { getCardLabel, isHardDecline } from "../_shared/declines.ts";
import { findEarlierRefund } from "../_shared/earlier-refund.ts";
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
}

const getCard = async (paymentMethodId: string) => {
  const { card } = await stripe.paymentMethods.retrieve(paymentMethodId);

  return getCardLabel(card?.brand, card?.last4);
};

export const chargeSavedCard = async (quote: CheckoutQuote) => {
  const paymentMethod = quote.payment_method_id as string;
  const cardLabel = await getCard(paymentMethod);
  const canTransfer = !!quote.stylist_account && quote.stylist_can_receive;

  // a try that charged, then failed before saving: keep that payment rather than charge again
  const { data: charged } = await stripe.paymentIntents.search({
    query: `metadata['checkout_booking']:'${quote.id}' AND status:'succeeded'`,
  });

  if (charged[0])
    return {
      paid: true,
      payment_intent_id: charged[0].id,
      charge_pence: charged[0].amount,
      transfer_pending: !charged[0].transfer_data,
      card_label: cardLabel,
    };

  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: quote.charge_pence,
        currency: "gbp",
        customer: quote.customer_id ?? undefined,
        payment_method: paymentMethod,
        off_session: true,
        confirm: true,
        description: `${quote.ref}: ${quote.service_name} balance`,
        metadata: { kind: "checkout", booking_id: quote.id, checkout_booking: quote.id },
        ...(canTransfer
          ? {
              application_fee_amount: getStripeFee(quote.charge_pence),
              transfer_data: { destination: quote.stylist_account as string },
            }
          : {}),
      },
      { idempotencyKey: getCheckoutChargeKey(quote.id, quote.tries) },
    );

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
export const refundOverpaid = async ({ id, refund_pence: amount, payment_intent_id: intentId }: CheckoutQuote) => {
  if (!amount || !intentId) return { refund_pence: 0 };

  const { data: earlier } = await stripe.refunds.list({ payment_intent: intentId, limit: 100 });
  const madeBefore = findEarlierRefund(earlier, "price_lowered");

  if (madeBefore) return { refund_pence: madeBefore.amount, refund_id: madeBefore.id };

  const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] });
  const refundAmount = Math.min(amount, getRefundable(intent.latest_charge));

  if (refundAmount <= 0) return { refund_pence: 0 };

  const refund = await stripe.refunds.create(
    {
      payment_intent: intentId,
      amount: refundAmount,
      metadata: { booking_id: id, reason: "price_lowered" },
      ...(intent.transfer_data ? { reverse_transfer: true } : {}),
    },
    { idempotencyKey: `checkout:${id}:price-lowered-refund:${refundAmount}` },
  );

  return { refund_pence: refundAmount, refund_id: refund.id };
};
