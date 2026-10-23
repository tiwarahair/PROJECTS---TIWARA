interface Refund {
  id: string;
  amount: number;
  status: string | null;
  metadata: Record<string, string> | null;
}

/** A refund for this reason already made on the payment, so a retry doesn't refund twice. */
export const findEarlierRefund = (refunds: Refund[], reason: string) =>
  refunds.find(({ metadata, status }) => metadata?.reason === reason && status !== "failed" && status !== "canceled");
