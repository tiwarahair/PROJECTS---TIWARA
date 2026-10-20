import { admin } from "../_shared/admin.ts";
import { getRecovery } from "../_shared/owed.ts";
import { CLEAR_RECOVERY } from "../_shared/recovery-metadata.ts";
import { stripe } from "../_shared/stripe.ts";
import { getPaymentParams, getRecoveryRoom } from "./payment-params.ts";
import type { CheckoutQuote } from "./payment-params.ts";
import type { Contact } from "./request.ts";

const OPEN_STATUSES = ["requires_payment_method", "requires_confirmation", "requires_action"];

export const getCustomerId = async (quote: CheckoutQuote, contact: Contact, clientId: string | null) => {
  const { data: profile } = clientId
    ? await admin.from("profiles").select("stripe_customer_id").eq("id", clientId).single()
    : { data: null };

  const savedId = clientId ? profile?.stripe_customer_id : quote.customer_id;

  if (savedId) return savedId as string;

  const customer = await stripe.customers.create(
    { email: contact.email, name: `${contact.first} ${contact.last}`, phone: contact.phone },
    { idempotencyKey: clientId ? `profile:${clientId}:customer` : `booking:${quote.id}:customer` },
  );

  if (clientId) await admin.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", clientId);

  return customer.id;
};

export const getPaymentIntent = async (quote: CheckoutQuote, customerId: string | null, keepCard: boolean) => {
  const recovered = await getRecovery(quote.stylist_account, getRecoveryRoom(quote));
  const params = getPaymentParams(quote, customerId, keepCard, recovered);

  // what's owed is part of the key, as it changes the charge's fee
  if (!quote.payment_intent_id)
    return stripe.paymentIntents.create(params, { idempotencyKey: `booking:${quote.id}:pi:${recovered}` });

  const existing = await stripe.paymentIntents.retrieve(quote.payment_intent_id);

  if (!OPEN_STATUSES.includes(existing.status)) return existing;

  const { amount, application_fee_amount, customer, setup_future_usage, metadata } = params;

  return stripe.paymentIntents.update(existing.id, {
    amount,
    metadata: { ...CLEAR_RECOVERY, ...metadata },
    ...(application_fee_amount ? { application_fee_amount } : {}),
    ...(customer ? { customer } : {}),
    setup_future_usage: setup_future_usage ?? "",
  });
};
