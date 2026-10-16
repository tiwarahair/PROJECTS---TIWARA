// What Stripe is asked to take for a booking. Deposits and full payments are destination charges: the stylist's
// account receives the payment less the booking fee. The other modes take only the booking fee, for the platform.

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

/** Deposit and card-on-file bookings keep the card for the balance and any fees under the policy. */
export const savesCard = (mode: CheckoutQuote["mode"]) =>
  mode === "deposit" || mode === "card";

/** keepCard: a signed-in client asked to save the card for future bookings. */
export const getPaymentParams = (
  quote: CheckoutQuote,
  customerId: string | null,
  keepCard = false,
) => ({
  amount: quote.due_today_pence,
  currency: "gbp",
  // cards (Apple Pay and Google Pay included) never leave the page; the Payment Element offers the same list
  allowed_payment_method_types: ["card"],
  description: `${quote.ref}: ${quote.service_name} with ${quote.stylist_name}`,
  metadata: { booking_id: quote.id, booking_ref: quote.ref },
  ...(customerId ? { customer: customerId } : {}),
  ...(savesCard(quote.mode) || keepCard ? { setup_future_usage: "off_session" } : {}),
  ...(quote.mode === "deposit" || quote.mode === "full"
    ? {
        application_fee_amount: quote.fee_pence,
        transfer_data: { destination: quote.stylist_account },
      }
    : {}),
});
