interface ChargeAmounts {
  amount: number;
  amount_refunded: number;
}

/** What's still refundable on a payment's charge (nothing when the charge isn't loaded). */
export const getRefundable = (charge: ChargeAmounts | string | null | undefined) =>
  typeof charge === "object" && charge ? charge.amount - charge.amount_refunded : 0;
