interface ReversalParts {
  refunded: number;
  transferLeft: number;
}

/**
 * How much of a later transfer goes back with a refund: the whole refund, like reverse_transfer on a payment sent
 * straight away, but never more than is left of what the stylist was sent.
 */
export const getReversalAmount = ({ refunded, transferLeft }: ReversalParts) =>
  Math.max(0, Math.min(refunded, transferLeft));
