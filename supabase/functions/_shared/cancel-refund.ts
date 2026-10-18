interface CancelTerms {
  fee_pence?: number;
  refund_pence: number;
}

/** A cancellation with a fee refunds nothing now: the settlement 24 hours later does, unless the fee is waived. */
export const getRefundNow = ({ fee_pence: fee = 0, refund_pence: refund }: CancelTerms) => (fee > 0 ? 0 : refund);
