// CheckoutSheet demo bookings and money maths (prototype CheckoutSheet.dc.html: BK, MENU, REASONS, RF_REASONS,
// STYLIST, IC, f, f2, seed, money, finalize, result, rfCtx).

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
  paidOn: string;
  phone: string;
  email: string;
  day: string;
  time: string;
  arrived: string;
  fee?: number;
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
  adjustmentAmount: string;
  adjustmentReason: string;
  adjustmentOther: string;
  adjustmentError: string;
  tip: TipChoice;
  tipCustom: string;
  tipOpen: boolean;
  method: PayMethod;
  linkVia: "sms" | "email";
  recordVia: RecordVia;
  tipReceived: string;
  status: CheckoutStatus;
  decline: "soft" | "hard" | null;
  tries: number;
  busy: boolean;
  fromDone: boolean;
  refundKind: "full" | "partial";
  refundAmount: string;
  refundReason: string;
  refundTried: boolean;
  refundFinal: number;
  refunded: number;
  refundLast: string;
  dialog: DialogKind | null;
  resendVia: "email" | "sms";
  resendTo: string;
  resendTried: boolean;
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
      ["Boho curls", 15, "+30 min"],
      ["Hair included", 20, "Pre-stretched, colour 1B"],
      ["Beads and cuffs", 8, "Gold or silver"],
      ["Wash and condition", 12, "+20 min"],
    ],
  },
  {
    title: "Services",
    rows: [
      ["Braid takedown", 30, "1 h"],
      ["Edges and baby hair", 10, "15 min"],
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
  check: "M20 6 9 17l-5-5",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  alert:
    "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  person:
    "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM16 11l2 2 4-4",
  card: "M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM2 10h20",
  link: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
  cash: "M2 7h20v10H2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  returnArrow: "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
  receipt: "M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4z",
};

export const roundPounds = (value: number): number =>
  Math.round(value * 100) / 100;

/** "£45", "£45.50", "−£20" (prototype f). */
export const formatPounds = (value: number): string => {
  const rounded = roundPounds(value);
  const absolute = Math.abs(rounded);
  const sign = rounded < 0 ? "−" : "";
  const amount = absolute % 1 === 0 ? String(absolute) : absolute.toFixed(2);

  return `${sign}£${amount}`;
};

/** Always two decimals (prototype f2), for receipts. */
export const formatPence = (value: number): string =>
  `${value < 0 ? "−" : ""}£${Math.abs(value).toFixed(2)}`;

/** A typed amount as pounds (prototype money().num). */
export const parsePounds = (value: string): number => {
  const parsed = parseFloat(String(value || "").replace(/[^0-9.]/g, ""));

  return isNaN(parsed) ? 0 : roundPounds(parsed);
};

export interface CheckoutSeedProps {
  scenario?: string;
  booking?: CheckoutBooking;
  start?: CheckoutView;
  done?: Partial<CheckoutResult> & { tip?: number };
  refunded?: number;
  linkPaid?: boolean;
}

/** Which demo booking a scenario uses; a host booking is "live". */
export const getBookingKey = (scenario: string, hasBooking: boolean): string =>
  hasBooking
    ? "live"
    : ({
        reduce: "nia",
        "reduce-review": "nia",
        link: "chi",
        awaiting: "chi",
        cash: "tola",
        unpaid: "tola",
      }[scenario] ?? (/^(fee|waive)/.test(scenario) ? "kemi" : "zainab"));

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
}

/** Totals, method and steps for the current state (prototype money()). */
export const getMoney = (
  state: CheckoutState,
  booking: CheckoutBooking,
): CheckoutMoney => {
  const isCardOk =
    !!booking.card && (state.mode === "deposit" || state.mode === "card");

  let lineTotal = 0;

  for (const { base, adjustment } of state.lines)
    lineTotal += base + adjustment;

  const items = roundPounds(lineTotal);
  const balance = roundPounds(items - state.paid);
  const due = Math.max(0, balance);
  const refundDue = Math.max(0, roundPounds(-balance));

  const getSelectedTip = () => {
    if (state.tip === "custom") return parsePounds(state.tipCustom);

    if (typeof state.tip === "number")
      return roundPounds((items * state.tip) / 100);

    return 0;
  };

  const selectedTip = getSelectedTip();
  const isPayNeeded = due > 0 || selectedTip > 0 || !!state.tipOpen;
  let method: PayMethod | "none" = isPayNeeded ? state.method : "none";

  if (method === "card" && !isCardOk) method = "link";

  const tip = method === "link" || method === "none" ? 0 : selectedTip;
  const charge = roundPounds(due + tip);

  const cardFee =
    (method === "card" || method === "link") && charge > 0
      ? roundPounds(charge * 0.015 + 0.2)
      : 0;

  const steps: CheckoutView[] = [
    "items",
    ...(isPayNeeded ? (["pay"] as const) : []),
    ...(isPayNeeded && method !== "link" ? (["tip"] as const) : []),
    "review",
  ];

  const bookFee = state.paid > 0 ? roundPounds(state.paid * 0.015 + 0.5) : 0;

  return {
    items,
    due,
    refundDue,
    selectedTip,
    tip,
    charge,
    cardFee,
    method,
    steps,
    bookFee,
    cardOk: isCardOk,
  };
};

/** The checkout outcome, and the status it leaves (prototype finalize()). */
export const getFinalized = (
  state: CheckoutState,
  booking: CheckoutBooking,
): Pick<CheckoutState, "done" | "status"> => {
  const money = getMoney(state, booking);

  return {
    done: {
      method: money.method,
      via: state.method === "link" ? state.linkVia : state.recordVia,
      charged: money.charge,
      tip: money.tip,
      refundAuto: money.refundDue,
    },
    status: money.method === "link" ? "awaiting" : "paid",
  };
};

/** The initial state for a scenario or a host booking (prototype seed()). */
export const getInitialCheckout = ({
  scenario = "arrived",
  booking: hostBooking,
  start,
  done,
  refunded,
  linkPaid,
}: CheckoutSeedProps): CheckoutState => {
  const bookingKey = getBookingKey(scenario, !!hostBooking);
  const booking = hostBooking ?? BOOKINGS[bookingKey]!;

  const state: CheckoutState = {
    bookingKey,
    mode: booking.mode,
    paid: booking.paid,
    isNonRefundable: false,
    view: "detail",
    direction: 0,
    lines: [
      {
        id: 1,
        name: booking.service,
        subtitle: booking.meta,
        base: booking.price,
        adjustment: 0,
        reason: "",
      },
      ...booking.addons.map(([name, price], index) => ({
        id: index + 2,
        name,
        subtitle: "Add-on",
        base: price,
        adjustment: 0,
        reason: "",
      })),
    ],
    nextLineId: 10,
    adjustingLineId: null,
    adjustmentAmount: "",
    adjustmentReason: "",
    adjustmentOther: "",
    adjustmentError: "",
    tip: "none",
    tipCustom: "",
    tipOpen: false,
    method:
      booking.card && (booking.mode === "deposit" || booking.mode === "card")
        ? "card"
        : "link",
    linkVia: "sms",
    recordVia: "cash",
    tipReceived: "",
    status: "arrived",
    decline: null,
    tries: 2,
    busy: false,
    fromDone: false,
    refundKind: "full",
    refundAmount: "",
    refundReason: "",
    refundTried: false,
    refundFinal: 0,
    refunded: 0,
    refundLast: "",
    dialog: null,
    resendVia: "email",
    resendTo: booking.email,
    resendTried: false,
    toast: "",
    done: null,
  };

  const finalize = () => Object.assign(state, getFinalized(state, booking));

  if (hostBooking) {
    if (Array.isArray(hostBooking.lines))
      state.lines = hostBooking.lines.map((line, index) => ({
        id: index + 1,
        adjustment: 0,
        reason: "",
        name: "",
        subtitle: "",
        base: 0,
        ...line,
      }));

    state.view = start || "items";

    if (done) {
      state.done = {
        method: done.method ?? "none",
        via: done.via ?? "",
        charged: done.charged ?? 0,
        tip: done.tip ?? 0,
        refundAuto: done.refundAuto ?? 0,
      };

      state.status = done.method === "link" && !linkPaid ? "awaiting" : "paid";

      if (done.tip && typeof done.tip === "number") {
        state.tip = "custom";
        state.tipCustom = String(done.tip);
      }

      if (done.method === "record") {
        state.method = "record";
        state.recordVia = (done.via as RecordVia) || "cash";
      }

      if (done.method === "link")
        state.linkVia = (done.via as "sms" | "email") || "sms";
    }

    state.refunded = refunded || 0;

    return state;
  }

  switch (scenario) {
    case "items":
      state.view = "items";
      break;
    case "tip":
      state.view = "tip";
      state.tip = 15;
      break;
    case "review":
      state.view = "review";
      state.tip = 15;
      break;
    case "done":
      state.tip = 15;
      finalize();
      state.view = "done";
      break;
    case "paid":
      state.tip = 15;
      finalize();
      break;
    case "refund":
      state.tip = 15;
      finalize();

      Object.assign(state, {
        view: "refund",
        refundKind: "partial",
        refundAmount: "20",
        refundReason: "Service issue",
      });

      break;
    case "receipt":
      state.tip = 15;
      finalize();
      state.view = "receipt";
      break;
    case "resend":
      state.tip = 15;
      finalize();

      Object.assign(state, {
        view: "resend",
        resendVia: "sms",
        resendTo: booking.phone,
      });

      break;
    case "reduce":
    case "reduce-review":
      state.lines[0]!.adjustment = -20;
      state.lines[0]!.reason = "Service shortened";
      state.view = scenario === "reduce" ? "items" : "review";
      break;
    case "link":
      state.method = "link";
      state.view = "pay";
      break;
    case "awaiting":
      state.method = "link";
      finalize();
      break;
    case "cash":
      Object.assign(state, {
        method: "record",
        view: "tip",
        tip: "custom",
        tipCustom: "5",
      });

      break;
    case "unpaid":
      state.status = "unpaid";
      break;
    case "declined":
      Object.assign(state, {
        tip: 15,
        view: "review",
        decline: "soft",
        tries: 1,
      });

      break;
    case "declined-hard":
      Object.assign(state, {
        tip: 15,
        view: "review",
        decline: "hard",
        tries: 0,
      });

      break;
    case "fee-pending":
      state.status = "feePending";
      break;
    case "fee-waived":
      state.status = "feeWaived";
      break;
    case "fee-unpaid":
      state.status = "feeUnpaid";
      break;
    case "fee-collected":
      state.status = "feeCollected";
      break;
    case "waive-dep":
      Object.assign(state, { status: "feePending", dialog: "waive" });
      break;
    case "waive-nonref":
      Object.assign(state, {
        status: "feePending",
        isNonRefundable: true,
        dialog: "waive",
      });

      break;
    case "waive-full":
      Object.assign(state, {
        status: "feePending",
        mode: "full",
        paid: 100,
        dialog: "waive",
      });

      break;
    case "waive-card":
      Object.assign(state, {
        status: "feePending",
        mode: "card",
        paid: 0,
        dialog: "waive",
      });

      break;
  }

  return state;
};

/** How much can be refunded through the platform, or recorded as refunded off it (prototype rfCtx()). */
export const getRefundContext = (
  state: CheckoutState,
  booking: CheckoutBooking,
): { platform: number; off: number } => {
  if (/^fee/.test(state.status)) return { platform: booking.fee || 0, off: 0 };

  const done = state.done ?? { charged: 0, refundAuto: 0, method: "none" };

  return {
    platform:
      state.paid -
      (done.refundAuto || 0) +
      (done.method === "card" || done.method === "link" ? done.charged : 0),
    off: done.method === "record" ? done.charged : 0,
  };
};
