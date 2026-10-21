export type EarningsScenario = "default" | "paused" | "setup";
export type TransactionStatus =
  "Pending" | "Available" | "On hold" | "Paid out" | "Refunded" | "Recorded";
export type PeriodId = "week" | "month" | "lastmonth" | "custom";

export type PayoutState = "Paid" | "In transit" | "Failed";

export interface EarningsClient {
  id: string;
  name: string;
  email?: string;
}

export interface Transaction {
  id: string;
  client: string;
  service: string;
  bookingRef: string;
  appointment: Date;
  description: string;
  method: string;
  at: Date;
  amount: number;
  fee: number | null;
  net: number;
  status: TransactionStatus;
  isRecorded?: boolean;
  hold?: boolean;
  holdUntil?: Date;
  refunded?: boolean;
  note?: string;
  payoutId?: string;
}

export interface Payout {
  id: string;
  amount: number;
  gross: number;
  fees: number;
  refunds: number;
  sent: Date;
  arrive: Date;
  status: PayoutState;
  items: Transaction[];
  from: Date;
}

export interface Ledger {
  transactions: Transaction[];
  payouts: Payout[];
  available: number;
  pending: number;
  onHold: number;
  pausedAmount: number;
  nextDate: Date | null;
  today: Date;
  scenario: EarningsScenario;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface Bucket {
  start: Date;
  end: Date;
  label: string;
  long: string;
}

export interface PeriodStats {
  takings: number;
  fees: number;
  refunds: number;
  net: number;
}

export const DAY_MS = 86400000;

export const FALLBACK_BANK = "your bank account";
export const STRIPE_PAYOUTS = "https://dashboard.stripe.com/settings/payouts";

export const PERIODS: [PeriodId, string][] = [
  ["week", "This week"],
  ["month", "This month"],
  ["lastmonth", "Last month"],
  ["custom", "Custom"],
];

/** Status tag colours: [background, text]. */
export const STATUS_COLOURS: Record<
  TransactionStatus | PayoutState,
  [string, string]
> = {
  Pending: ["var(--fill-quiet)", "var(--neutral-600)"],
  Available: ["rgba(47,122,77,.1)", "#2f7a4d"],
  "On hold": ["rgba(181,84,31,.1)", "#9a4516"],
  "Paid out": ["rgba(26,23,20,.07)", "var(--text-primary)"],
  Refunded: ["var(--accent-wash)", "var(--accent-700)"],
  Recorded: ["var(--fill-quiet)", "var(--neutral-600)"],
  Paid: ["rgba(47,122,77,.1)", "#2f7a4d"],
  "In transit": ["rgba(26,23,20,.07)", "var(--text-primary)"],
  Failed: ["rgba(143,17,18,.1)", "var(--accent-700)"],
};
