/** Stripe's fee on a UK card payment (1.5% + 20p), which the stylist pays on their part; matches get_card_fee_pence. */
export const getStripeFee = (pence: number) => (pence > 0 ? Math.round(pence * 0.015) + 20 : 0);
