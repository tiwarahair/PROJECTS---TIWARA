export type EarningsScenario =
  "default" | "onhold" | "paused" | "setup" | "empty";
export type TransactionStatus =
  "Pending" | "Available" | "On hold" | "Paid out" | "Refunded" | "Recorded";
export type PeriodId = "week" | "month" | "lastmonth" | "custom";

export type PayoutState = "Paid" | "In transit" | "Failed";

export interface EarningsClient {
  id: string;
  name: string;
  email?: string;
}

/** A Studio service (only the fields the ledger reads). */
export interface EarningsService {
  name: string;
  price: number | string;
  status?: string;
  durationHours?: number | string;
  durationMinutes?: number | string;
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

export type NewTransaction = Omit<Transaction, "id" | "fee" | "net" | "status">;

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

export interface LedgerService {
  name: string;
  price: number;
  hours: number;
}

export interface AppointmentOptions {
  service?: LedgerService;
  clientIndex?: number;
  hold?: boolean;
  flow?: number;
  method?: string;
}

export interface TransactionLog {
  transactions: Transaction[];
  count: number;
  add: (entry: NewTransaction) => Transaction;
}

export interface LedgerContext {
  now: Date;
  today: Date;
  random: () => number;
  log: TransactionLog;
  clientList: EarningsClient[];
  serviceList: LedgerService[];
}

export interface Visit {
  service: LedgerService;
  at: Date;
  end: Date;
  booked: Date;
  rolls: [number, number, number, number, number];
  deposit: number;
  base: Omit<NewTransaction, "description" | "method" | "at" | "amount">;
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

export const DEFAULT_BANK = "Barclays •••• 4471";
export const STRIPE_PAYOUTS = "https://dashboard.stripe.com/settings/payouts";

export const PERIODS: [PeriodId, string][] = [
  ["week", "This week"],
  ["month", "This month"],
  ["lastmonth", "Last month"],
  ["custom", "Custom"],
];

export const DEFAULT_CLIENTS: EarningsClient[] = [
  { id: "nia", name: "Nia Okafor", email: "nia.okafor@gmail.com" },
  { id: "ruth", name: "Ruth Mensah", email: "ruth.mensah@outlook.com" },
  { id: "kemi", name: "Kemi Adeyemi", email: "kemi.a@icloud.com" },
  { id: "zainab", name: "Zainab Bello" },
  { id: "amara", name: "Amara Osei" },
  { id: "tola", name: "Tola Fashola" },
  { id: "chi", name: "Chidinma Eze" },
  { id: "yasmin", name: "Yasmin Diallo" },
];

export const DEFAULT_SERVICES: LedgerService[] = [
  { name: "Knotless braids", price: 85, hours: 4.5 },
  { name: "Box braids", price: 70, hours: 4 },
  { name: "Silk press", price: 65, hours: 2 },
  { name: "Loc retwist", price: 55, hours: 2 },
  { name: "Cornrows", price: 45, hours: 1.5 },
  { name: "Twist out", price: 50, hours: 1.5 },
  { name: "Fulani braids", price: 80, hours: 4 },
];

export const SLOTS = [
  [9, 30],
  [11, 0],
  [13, 30],
  [15, 0],
  [16, 30],
] as const;

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
