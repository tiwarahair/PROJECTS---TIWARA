interface Refund {
  id: string;
  status: string | null;
  metadata: Record<string, string> | null;
}

/** A cancellation refund already made for this payment, so a retry doesn't refund twice. */
export const findEarlierRefund = (refunds: Refund[]) =>
  refunds.find(
    ({ metadata, status }) => metadata?.reason === "client_cancelled" && status !== "failed" && status !== "canceled",
  );
