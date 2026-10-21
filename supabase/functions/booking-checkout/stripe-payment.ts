import { admin } from "../_shared/admin.ts";
import { getRecovery } from "../_shared/owed.ts";
import { isPayoutHeld } from "../_shared/payout-hold.ts";
import { CLEAR_RECOVERY } from "../_shared/recovery-metadata.ts";
import { stripe } from "../_shared/stripe.ts";
import { getPaymentParams, getRecoveryRoom, paysStylist } from "./payment-params.ts";
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
  const existing = quote.payment_intent_id ? await stripe.paymentIntents.retrieve(quote.payment_intent_id) : null;

  if (existing && !OPEN_STATUSES.includes(existing.status)) return existing;

  // an earlier try keeps its transfer choice, so its fee and any debt it recovers stay consistent
  const isHeld =
    paysStylist(quote.mode) && (existing ? !existing.transfer_data : await isPayoutHeld(quote.stylist_account));

  const recovered = isHeld ? 0 : await getRecovery(quote.stylist_account, getRecoveryRoom(quote));
  const params = getPaymentParams(quote, customerId, keepCard, recovered, isHeld);

  // what's owed and the hold are part of the key, as they change the charge
  if (!existing)
    return stripe.paymentIntents.create(params, {
      idempotencyKey: `booking:${quote.id}:pi:${recovered}${isHeld ? ":held" : ""}`,
    });

  const { amount, application_fee_amount, customer, setup_future_usage, metadata } = params;

  return stripe.paymentIntents.update(existing.id, {
    amount,
    metadata: { ...CLEAR_RECOVERY, ...metadata },
    ...(application_fee_amount ? { application_fee_amount } : {}),
    ...(customer ? { customer } : {}),
    setup_future_usage: setup_future_usage ?? "",
  });
};
