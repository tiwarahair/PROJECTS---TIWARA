import { getRecoveryMetadata } from "../_shared/recovery-metadata.ts";
import { getStripeFee } from "../_shared/stripe-fee.ts";

export interface CheckoutQuote {
  id: string;
  ref: string;
  mode: "none" | "deposit" | "full" | "card";
  due_today_pence: number;
  fee_pence: number;
  service_name: string;
  stylist_account: string;
  stylist_name: string;
  customer_id: string | null;
  payment_intent_id: string | null;
}

export const savesCard = (mode: CheckoutQuote["mode"]) => mode === "deposit" || mode === "card";

/** Deposit and full payments go to the stylist's Stripe account; the other modes only take the booking fee. */
export const paysStylist = (mode: CheckoutQuote["mode"]) => mode === "deposit" || mode === "full";

const getStylistFee = (quote: CheckoutQuote) => quote.fee_pence + getStripeFee(quote.due_today_pence - quote.fee_pence);

export const getRecoveryRoom = (quote: CheckoutQuote) =>
  paysStylist(quote.mode) ? quote.due_today_pence - getStylistFee(quote) : 0;

export const getPaymentParams = (
  quote: CheckoutQuote,
  customerId: string | null,
  requireCvc = false,
  recovered = 0,
  isHeld = false,
) => ({
  amount: quote.due_today_pence,
  currency: "gbp",
  // Apple Pay and Google Pay are cards
  allowed_payment_method_types: ["card"],
  description: `${quote.ref}: ${quote.service_name} with ${quote.stylist_name}`,
  metadata: {
    booking_id: quote.id,
    booking_ref: quote.ref,
    ...getRecoveryMetadata(quote.stylist_account, recovered),
    ...(isHeld ? { hold: "true", kept_pence: String(getStylistFee(quote)) } : {}),
  },
  ...(customerId ? { customer: customerId } : {}),
  ...(savesCard(quote.mode) ? { setup_future_usage: "off_session" } : {}),
  // a signed-in client can pay with a saved card, so its CVC is asked for again; always set, so a retry can turn it off
  payment_method_options: { card: { require_cvc_recollection: requireCvc } },
  ...(paysStylist(quote.mode) && !isHeld
    ? {
        // the booking fee, plus Stripe's fee on the stylist's part (and anything they owe)
        application_fee_amount: getStylistFee(quote) + recovered,
        transfer_data: { destination: quote.stylist_account },
      }
    : {}),
});
