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

/** For a transfer found from an earlier try: the refunds made before it, which its amount allowed for. */
export const getRefundsBefore = (refunds: Refund[], transferCreated: number) =>
  refunds.filter((refund) => isLiveRefund(refund) && refund.created < transferCreated).map(({ id }) => id);
