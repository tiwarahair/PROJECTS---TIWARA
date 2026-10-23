import type Stripe from "npm:stripe@22.6.2";
import { getRecovery } from "../_shared/owed.ts";
import { isPayoutHeld } from "../_shared/payout-hold.ts";
import { CLEAR_RECOVERY } from "../_shared/recovery-metadata.ts";
import { stripe } from "../_shared/stripe.ts";
import { getPaymentParams, getRecoveryRoom, paysStylist } from "../booking-checkout/payment-params.ts";
import type { CheckoutQuote } from "../booking-checkout/payment-params.ts";
import { isCurrentIntent } from "../payment-link/intent.ts";

export interface ConfirmQuote extends CheckoutQuote {
  email: string | null;
  first: string;
  last: string | null;
  phone: string | null;
  link_version: number;
  confirm_sent_at: string;
}

const OPEN_STATUSES = ["requires_payment_method", "requires_confirmation", "requires_action"];

/** The client's Stripe customer; keyed by their email too, since a stylist can change who the booking is for. */
export const getConfirmCustomer = async (quote: ConfirmQuote) => {
  if (quote.customer_id) return quote.customer_id;

  const { id } = await stripe.customers.create(
    {
      ...(quote.email ? { email: quote.email } : {}),
      name: [quote.first, quote.last].filter(Boolean).join(" "),
      ...(quote.phone ? { phone: quote.phone } : {}),
    },
    { idempotencyKey: `booking:${quote.id}:customer:${quote.link_version}` },
  );

  return id;
};

/** The payment for what's due now: the open one brought up to date, or a new one (after a change, a refund or a new client). */
// an earlier try keeps its transfer choice, so its fee and any debt it recovers stay consistent
const getParams = async (quote: ConfirmQuote, customerId: string, existing: Stripe.PaymentIntent | null) => {
  const isHeld =
    paysStylist(quote.mode) && (existing ? !existing.transfer_data : await isPayoutHeld(quote.stylist_account));

  const recovered = isHeld ? 0 : await getRecovery(quote.stylist_account, getRecoveryRoom(quote));

  return { isHeld, recovered, params: getPaymentParams(quote, customerId, false, recovered, isHeld) };
};

export const getConfirmIntent = async (quote: ConfirmQuote, customerId: string) => {
  if (quote.payment_intent_id) {
    const existing = await stripe.paymentIntents.retrieve(quote.payment_intent_id, { expand: ["latest_charge"] });

    if (isCurrentIntent(existing) && !OPEN_STATUSES.includes(existing.status)) return existing;

    if (OPEN_STATUSES.includes(existing.status) && existing.customer === customerId) {
      const {
        params: { amount, application_fee_amount, setup_future_usage, metadata },
      } = await getParams(quote, customerId, existing);

      return stripe.paymentIntents.update(existing.id, {
        amount,
        metadata: { ...CLEAR_RECOVERY, ...metadata },
        ...(application_fee_amount ? { application_fee_amount } : {}),
        setup_future_usage: setup_future_usage ?? "",
      });
    }
  }

  const { isHeld, recovered, params } = await getParams(quote, customerId, null);

  return stripe.paymentIntents.create(params, {
    idempotencyKey: `confirm:${quote.id}:${quote.link_version}:after:${quote.payment_intent_id ?? "none"}:${quote.due_today_pence}:${recovered}${isHeld ? ":held" : ""}`,
  });
};
