// CheckoutSheet types and constants.
import {
  Banknote,
  Check,
  Clock,
  CreditCard,
  Link,
  Receipt,
  Send,
  TriangleAlert,
  Undo2,
  UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PaymentMode = "deposit" | "full" | "card" | "none";
export type CheckoutView =
  | "detail"
  | "items"
  | "add"
  | "tip"
  | "pay"
  | "review"
  | "done"
  | "receipt"
  | "refund"
  | "resend";
export type CheckoutStatus =
  | "arrived"
  | "unpaid"
  | "paid"
  | "awaiting"
  | "feePending"
  | "feeWaived"
  | "feeUnpaid"
  | "feeCollected";

export type PayMethod = "card" | "link" | "record";
export type RecordVia = "cash" | "bank" | "reader";
export type DialogKind =
  "waive" | "refund" | "cancelLink" | "retryFee" | "recordFee" | "undoNs";

export type TipChoice = "none" | "custom" | number;

export interface CheckoutBooking {
  ref?: string;
  receiptDate?: string;
  client: string;
  first: string;
  service: string;
  meta: string;
  price: number;
  addons: [string, number][];
  mode: PaymentMode;
  paid: number;
  card: string | null;
  brand: string;
  cardLabel?: string;
  paidOn: string;
  phone: string;
  email: string;
  day: string;
  time: string;
  arrived: string;
  fee?: number;
  agreedPrice?: number;
  /** Paid at an earlier checkout (cash, bank, reader), less what went back since. */
  paidLater?: number;
  /** Of what was paid, how much can go back to the card; the rest of a refund is handed back the way it was paid. */
  refundableOnline?: number;
  recordedVia?: string;
  /** A Studio booking can bring its own item lines. */
  lines?: Partial<CheckoutLine>[];
}

export interface CheckoutLine {
  id: number;
  name: string;
  subtitle: string;
  base: number;
  adjustment: number;
  reason: string;
  added?: boolean;
}

export interface CheckoutResult {
  method: PayMethod | "none";
  via: string;
  charged: number;
  tip: number;
  refundAuto: number;
  cashBack?: number;
}

export interface RefundValues {
  kind: "full" | "partial";
  amount: string;
  reason: string;
}

export const EMPTY_REFUND: RefundValues = {
  kind: "full",
  amount: "",
  reason: "",
};

export interface CheckoutState {
  mode: PaymentMode;
  paid: number;
  isNonRefundable: boolean;
  view: CheckoutView;
  direction: number;
  lines: CheckoutLine[];
  nextLineId: number;
  adjustingLineId: number | null;
  tip: TipChoice;
  tipCustom: string;
  tipOpen: boolean;
  method: PayMethod;
  linkVia: "sms" | "email";
  recordVia: RecordVia;
  tipReceived: string;
  status: CheckoutStatus;
  decline: "soft" | "hard" | null;
  declineMessage?: string;
  tries: number;
  busy: boolean;
  fromDone: boolean;
  refund: RefundValues;
  refundFinal: number;
  refunded: number;
  refundLast: string;
  dialog: DialogKind | null;
  toast: string;
  done: CheckoutResult | null;
}

export interface MenuGroup {
  title: string;
  rows: [string, number, string][];
}

export const ADJUST_REASONS = [
  "Service shortened",
  "Extra time or products",
  "Goodwill",
  "Price error",
  "Other",
];
export const REFUND_REASONS = [
  "Goodwill",
  "Service issue",
  "Price adjusted",
  "Other",
];

export interface CheckoutStylist {
  name: string;
  address: string;
  vat: string;
}

export const ICONS = {
  check: Check,
  clock: Clock,
  alert: TriangleAlert,
  person: UserCheck,
  card: CreditCard,
  link: Link,
  cash: Banknote,
  returnArrow: Undo2,
  receipt: Receipt,
  send: Send,
} satisfies Record<string, LucideIcon>;

export interface CheckoutSeedProps {
  booking: CheckoutBooking;
  start?: CheckoutView;
  done?: Partial<CheckoutResult> & { tip?: number };
  refunded?: number;
  linkPaid?: boolean;
}

export interface CheckoutMoney {
  items: number;
  due: number;
  refundDue: number;
  refundCard: number;
  cashBack: number;
  selectedTip: number;
  tip: number;
  charge: number;
  cardFee: number;
  method: PayMethod | "none";
  steps: CheckoutView[];
  bookFee: number;
  cardOk: boolean;
  isOverAgreed: boolean;
  tipCap: number;
  isTipTooHigh: boolean;
}
