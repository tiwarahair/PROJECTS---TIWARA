// CheckoutSheet types, demo bookings and constants.
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
  bookingKey: string;
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
  resendVia: "email" | "sms";
  toast: string;
  done: CheckoutResult | null;
}

export const BOOKINGS: Record<string, CheckoutBooking> = {
  zainab: {
    client: "Zainab Bello",
    first: "Zainab",
    service: "Knotless braids",
    meta: "Medium, mid-back",
    price: 85,
    addons: [["Boho curls", 15]],
    mode: "deposit",
    paid: 20,
    card: "4242",
    brand: "Visa",
    paidOn: "Mon 10 Aug",
    phone: "07700 900418",
    email: "zainab.bello@gmail.com",
    day: "Thu 10 Sep",
    time: "10:00–15:00",
    arrived: "09:56",
  },
  nia: {
    client: "Nia Johnson",
    first: "Nia",
    service: "Silk press",
    meta: "Shoulder length",
    price: 100,
    addons: [],
    mode: "full",
    paid: 100,
    card: "1881",
    brand: "Mastercard",
    paidOn: "Fri 4 Sep",
    phone: "07700 900233",
    email: "nia.johnson@outlook.com",
    day: "Thu 10 Sep",
    time: "11:30–13:30",
    arrived: "11:24",
  },
  chi: {
    client: "Chi Eze",
    first: "Chi",
    service: "Box braids",
    meta: "Small, waist length",
    price: 120,
    addons: [],
    mode: "card",
    paid: 0,
    card: "0027",
    brand: "Visa",
    paidOn: "",
    phone: "07700 900511",
    email: "chi.eze@gmail.com",
    day: "Thu 10 Sep",
    time: "09:00–14:00",
    arrived: "08:52",
  },
  tola: {
    client: "Tola Okafor",
    first: "Tola",
    service: "Cornrows",
    meta: "Straight back, 8 rows",
    price: 45,
    addons: [],
    mode: "none",
    paid: 0,
    card: null,
    brand: "",
    paidOn: "",
    phone: "07700 900677",
    email: "tola.okafor@yahoo.co.uk",
    day: "Thu 10 Sep",
    time: "12:00–13:30",
    arrived: "12:04",
  },
  kemi: {
    client: "Kemi Adeyemi",
    first: "Kemi",
    service: "Silk press",
    meta: "Mid-back length",
    price: 100,
    addons: [],
    mode: "deposit",
    paid: 20,
    card: "4242",
    brand: "Visa",
    paidOn: "Tue 1 Sep",
    phone: "07700 900302",
    email: "kemi.adeyemi@gmail.com",
    day: "Wed 9 Sep",
    time: "17:00–19:00",
    arrived: "16:58",
    fee: 50,
  },
};

export interface MenuGroup {
  title: string;
  rows: [string, number, string][];
}

export const DEFAULT_MENU: MenuGroup[] = [
  {
    title: "Add-ons",
    rows: [
      ["Boho curls", 15, "+30m"],
      ["Hair included", 20, "Pre-stretched, colour 1B"],
      ["Beads and cuffs", 8, "Gold or silver"],
      ["Wash and condition", 12, "+20m"],
    ],
  },
  {
    title: "Services",
    rows: [
      ["Braid takedown", 30, "1h"],
      ["Edges and baby hair", 10, "15m"],
    ],
  },
];

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

export const DEFAULT_STYLIST: CheckoutStylist = {
  name: "Amara Beauty",
  address: "118 Wilmslow Road, Manchester M14 5AJ",
  vat: "GB 312 4567 89",
};

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
  scenario?: string;
  booking?: CheckoutBooking;
  start?: CheckoutView;
  done?: Partial<CheckoutResult> & { tip?: number };
  refunded?: number;
  linkPaid?: boolean;
}

export interface CheckoutMoney {
  items: number;
  due: number;
  refundDue: number;
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
