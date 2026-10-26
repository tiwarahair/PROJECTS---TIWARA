// A checkout's card charge on the client's saved card, and the refund when they paid more than the final price.
import Stripe from "stripe";
import { getCardLabel, isHardDecline } from "../_shared/declines.ts";
import { getRefundable } from "../_shared/refundable.ts";
import { getRecovery } from "../_shared/owed.ts";
import { isPayoutHeld } from "../_shared/payout-hold.ts";
import { getRecoveryMetadata } from "../_shared/recovery-metadata.ts";
import { getStripeFee } from "../_shared/stripe-fee.ts";
import { getCheckoutChargeKey } from "../_shared/stripe-keys.ts";
import { stripe } from "../_shared/stripe.ts";
import { getUnsavedCharge } from "../_shared/unsaved-charge.ts";

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
  checkout_intent_ids: string[];
  refund_failures: number;
  card_intents: string[];
  booking_fee_pence: number;
  lowered_refunds: number;
  online_pence: number;
  recorded_pence: number;
  recorded_via: string | null;
}

/** Card charges from earlier tries that were never saved as a payment, and what became of each. */
export const getUnsavedCharges = async ({ checkout_intent_ids: intentIds, card_intents: saved }: CheckoutQuote) => {
  const results = await Promise.allSettled(
    intentIds.filter((intentId) => !saved.includes(intentId)).map(getUnsavedCharge),
  );

  // one Stripe can't tell us about stays listed for the clean-up job, rather than stopping this checkout
  return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
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
  payment_intent_id: string | null;
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
  const canTransfer =
    !!quote.stylist_account && quote.stylist_can_receive && !(await isPayoutHeld(quote.stylist_account));

  // a try that charged, then failed before saving: keep that payment rather than charge again
  if (earlier)
    return {
      paid: true,
      payment_intent_id: earlier.id,
      charge_pence: earlier.amount,
      transfer_pending: !earlier.transfer_data,
      card_label: cardLabel,
    };

  let createdId: string | null = null;
  const stripeFee = getStripeFee(quote.charge_pence);
  const recovered = canTransfer ? await getRecovery(quote.stylist_account, quote.charge_pence - stripeFee) : 0;

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
          ...getRecoveryMetadata(quote.stylist_account, recovered),
          ...(canTransfer ? {} : { kept_pence: String(stripeFee) }),
        },
        ...(canTransfer
          ? {
              application_fee_amount: stripeFee + recovered,
              transfer_data: { destination: quote.stylist_account as string },
            }
          : {}),
      },
      {
        idempotencyKey: `${getCheckoutChargeKey(quote.id, quote.tries, quote.charge_pence, quote.tip_pence)}:${recovered}${canTransfer ? "" : ":kept"}`,
      },
    );

    createdId = created.id;
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
      payment_intent_id: createdId,
      hard: isHardDecline(code) || code === "authentication_required",
      message: error.message,
      card_label: cardLabel,
    };
  }
};

/** Gives back to the card what the client paid online over the final price; the stylist's card fee stays paid. */
export const refundOverpaid = async ({
  id,
  refund_pence: amount,
  payment_intent_id: intentId,
  booking_fee_pence: bookingFee,
  lowered_refunds: saved,
  online_pence: online,
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
  const refundAmount = Math.min(amount, online, getRefundable(intent.latest_charge) - bookingFee);

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

/** The rest of an overpayment, paid outside the app: the stylist hands it back the same way. */
export const getGivenBack = (
  { refund_pence: amount, recorded_pence: recorded, recorded_via: via }: CheckoutQuote,
  refundedToCard: number,
) => {
  const givenBack = Math.min(Math.max(amount - refundedToCard, 0), recorded);

  return givenBack > 0 ? { given_back_pence: givenBack, given_back_via: via ?? "cash" } : {};
};
