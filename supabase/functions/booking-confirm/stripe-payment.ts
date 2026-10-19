import { stripe } from "../_shared/stripe.ts";
import { getPaymentParams } from "../booking-checkout/payment-params.ts";
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
export const getConfirmIntent = async (quote: ConfirmQuote, customerId: string) => {
  const params = getPaymentParams(quote, customerId);

  if (quote.payment_intent_id) {
    const existing = await stripe.paymentIntents.retrieve(quote.payment_intent_id, { expand: ["latest_charge"] });

    if (isCurrentIntent(existing) && !OPEN_STATUSES.includes(existing.status)) return existing;

    if (OPEN_STATUSES.includes(existing.status) && existing.customer === customerId) {
      const { amount, application_fee_amount, setup_future_usage } = params;

      return stripe.paymentIntents.update(existing.id, {
        amount,
        ...(application_fee_amount ? { application_fee_amount } : {}),
        setup_future_usage: setup_future_usage ?? "",
      });
    }
  }

  return stripe.paymentIntents.create(params, {
    idempotencyKey: `confirm:${quote.id}:${quote.link_version}:after:${quote.payment_intent_id ?? "none"}:${quote.due_today_pence}`,
  });
};
