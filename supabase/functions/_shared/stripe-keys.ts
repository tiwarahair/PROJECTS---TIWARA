// Stripe idempotency keys. Stripe replays a key's first result for a day, so a retry after a failure gets a new key;
// what an earlier try already did is looked up in Stripe before anything is made again.

interface FeeKeyParts {
  id: string;
  tries: number;
  reruns: number;
  refunded_pence: number;
}

const getAttempt = (label: string, count: number) => (count > 0 ? `:${label}:${count}` : "");

export const getFeeChargeKey = ({ id, tries, reruns }: FeeKeyParts) =>
  `fee:${id}:try:${tries}${getAttempt("rerun", reruns)}`;

export const getFeeRefundKey = ({ id, refunded_pence: refunded, reruns }: FeeKeyParts, amount: number) =>
  `fee:${id}:refund:${refunded}:${amount}${getAttempt("rerun", reruns)}`;

export const getCancelRefundKey = (bookingId: string, reason: string, amount: number, failures: number) =>
  `booking:${bookingId}:${reason}-refund:${amount}${getAttempt("retry", failures)}`;

export const getTransferKey = (paymentId: string, failures: number) =>
  `fee-transfer:${paymentId}${getAttempt("retry", failures)}`;
