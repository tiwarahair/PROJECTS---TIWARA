interface Refund {
  id: string;
  amount: number;
  status: string | null;
  created: number;
}

export const isLiveRefund = ({ status }: Refund) => status !== "failed" && status !== "canceled";

/** Refunds a transfer's amount didn't allow for: made while it was being sent, so taken back from it afterwards. */
export const getUncountedRefunds = <Made extends Refund>(refunds: Made[], counted: string[]) =>
  refunds.filter((refund) => isLiveRefund(refund) && !counted.includes(refund.id));

/** For an earlier try's transfer that didn't record what it allowed for: the refunds made before it. */
export const getRefundsBefore = (refunds: Refund[], transferCreated: number) =>
  refunds.filter((refund) => isLiveRefund(refund) && refund.created < transferCreated).map(({ id }) => id);

/**
 * The refunds a transfer's amount allowed for go with it, so a retry that finds it knows them exactly. Stripe keeps
 * up to 500 characters, far more refunds than one payment has.
 */
export const toCountedMetadata = (counted: string[]): Record<string, string> => {
  // Stripe drops an empty value, so none is written out
  const ids = counted.join(",") || "none";

  return ids.length <= 500 ? { counted_refunds: ids } : {};
};

/** What toCountedMetadata recorded, or null for a transfer that didn't record it. */
export const readCountedRefunds = (metadata: Record<string, string> | null | undefined) => {
  const ids = metadata?.counted_refunds;

  if (ids === undefined) return null;

  return ids === "none" ? [] : ids.split(",");
};
