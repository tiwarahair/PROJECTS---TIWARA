// The stylist's money from the database → the shape Earnings shows
import type {
  EarningsClient,
  Ledger,
  Payout,
  PayoutState,
  Transaction,
  TransactionStatus,
} from "../../../components/earnings/data";
import type {
  LedgerRow,
  PayoutRow,
  StudioEarnings,
} from "../../../lib/studio-api/earnings";
import { getTotals } from "../../../components/earnings/logic";
import { roundToPence } from "../../../utils/money";

const PAYOUT_STATES: Record<string, PayoutState> = {
  paid: "Paid",
  failed: "Failed",
};

const toPounds = (pence: number) => pence / 100;

const toTransaction = (row: LedgerRow): Transaction => {
  const amount = toPounds(row.amount_pence);
  const fee = row.card_fee_pence === null ? null : toPounds(row.card_fee_pence);

  return {
    id: row.id,
    client: row.client_id,
    service: row.service ?? "",
    bookingRef: row.booking_ref ?? "",
    appointment: new Date(row.appointment),
    description: row.description,
    method: row.method,
    at: new Date(row.at),
    amount,
    fee,
    net: roundToPence(amount - (fee ?? 0)),
    status: row.status as TransactionStatus,
    ...(row.status === "Recorded" ? { isRecorded: true } : {}),
    ...(row.note ? { note: row.note } : {}),
    ...(row.payout_id ? { payoutId: row.payout_id } : {}),
  };
};

const toPayout = (row: PayoutRow, transactions: Transaction[]): Payout => {
  const items = transactions.filter(({ payoutId }) => payoutId === row.id);
  const sent = new Date(row.created_at);
  const { gross, fees, refunds } = getTotals(items);

  return {
    id: row.id,
    amount: toPounds(row.amount_pence),
    gross,
    fees,
    refunds,
    sent,
    arrive: row.arrival_date ? new Date(row.arrival_date) : sent,
    status: PAYOUT_STATES[row.status] ?? "In transit",
    items,
    from: items.length
      ? new Date(Math.min(...items.map(({ at }) => at.getTime())))
      : sent,
  };
};

export const toLedger = ({
  lines,
  payouts,
  balance,
}: StudioEarnings): Ledger => {
  const transactions = lines.map(toTransaction);

  return {
    transactions,
    payouts: payouts
      .filter(({ status }) => status !== "canceled")
      .map((row) => toPayout(row, transactions)),
    available: toPounds(balance.available_pence),
    pending: toPounds(balance.pending_pence),
    onHold: 0,
    pausedAmount: 0,
    nextDate: balance.next_payout ? new Date(balance.next_payout) : null,
    today: new Date(),
    scenario: "default",
  };
};

/** Each client in the ledger once, for the names Earnings shows. */
export const getLedgerClients = ({ lines }: StudioEarnings) => {
  const clients = new Map<string, EarningsClient>();

  for (const { client_id: id, client_name: name } of lines)
    clients.set(id, { id, name });

  return [...clients.values()];
};

/** The newest payout, when it failed: the balance card asks for new bank details. */
export const getFailedPayout = ({ payouts }: StudioEarnings) => {
  const latest = payouts.find(({ status }) => status !== "canceled");

  return latest?.status === "failed" ? toPounds(latest.amount_pence) : 0;
};
