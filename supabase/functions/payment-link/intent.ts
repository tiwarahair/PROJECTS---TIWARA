interface LinkIntent {
  status: string;
  latest_charge?: { amount_refunded: number } | string | null;
}

const OPEN_STATUSES = ["requires_payment_method", "requires_confirmation", "requires_action"];

/**
 * Whether the link's last payment still stands: open to pay, confirming, or paid. A refunded one (the fee changed
 * while it was paid, then the link was reopened) is replaced so the client can pay again.
 */
export const isCurrentIntent = ({ status, latest_charge: charge }: LinkIntent) => {
  if (OPEN_STATUSES.includes(status) || status === "processing") return true;

  if (status !== "succeeded") return false;

  return !(typeof charge === "object" && charge && charge.amount_refunded > 0);
};
