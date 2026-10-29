// CheckoutSheet money maths and initial state.
import { roundToPence } from "../../utils/money";
import { EMPTY_REFUND } from "./data";
import type {
  CheckoutBooking,
  CheckoutMoney,
  CheckoutSeedProps,
  CheckoutState,
  CheckoutView,
  PayMethod,
  RecordVia,
} from "./data";

export const parsePounds = (value: string): number => {
  const parsed = parseFloat(String(value || "").replace(/[^0-9.]/g, ""));

  return isNaN(parsed) ? 0 : roundToPence(parsed);
};

/** Totals, method and steps for the current state. */
export const getMoney = (
  state: CheckoutState,
  booking: CheckoutBooking,
): CheckoutMoney => {
  let lineTotal = 0;

  for (const { base, adjustment } of state.lines)
    lineTotal += base + adjustment;

  const items = roundToPence(lineTotal);

  const isOverAgreed =
    booking.agreedPrice !== undefined && items > booking.agreedPrice;

  const isCardOk =
    !!booking.card &&
    (state.mode === "deposit" || state.mode === "card") &&
    !isOverAgreed;

  const balance = roundToPence(items - state.paid - (booking.paidLater ?? 0));
  const due = Math.max(0, balance);
  const refundDue = Math.max(0, roundToPence(-balance));

  const cashBack =
    booking.refundableOnline === undefined
      ? 0
      : Math.max(0, roundToPence(refundDue - booking.refundableOnline));

  const refundCard = roundToPence(refundDue - cashBack);

  const getSelectedTip = () => {
    if (state.tip === "custom") return parsePounds(state.tipCustom);

    if (typeof state.tip === "number")
      return roundToPence((items * state.tip) / 100);

    return 0;
  };

  const selectedTip = getSelectedTip();
  const isPayNeeded = due > 0 || selectedTip > 0 || !!state.tipOpen;
  let method: PayMethod | "none" = isPayNeeded ? state.method : "none";

  if (method === "card" && !isCardOk) method = "link";

  const tip = method === "link" || method === "none" ? 0 : selectedTip;
  const charge = roundToPence(due + tip);

  if (charge === 0) method = "none";

  const tipCap = roundToPence(items * 0.25);

  const cardFee =
    (method === "card" || method === "link") && charge > 0
      ? roundToPence(charge * 0.015 + 0.2)
      : 0;

  const steps: CheckoutView[] = [
    "items",
    ...(isPayNeeded ? (["pay"] as const) : []),
    ...(isPayNeeded && method !== "link" ? (["tip"] as const) : []),
    "review",
  ];

  const bookFee = state.paid > 0 ? roundToPence(state.paid * 0.015 + 0.5) : 0;

  return {
    items,
    due,
    refundDue,
    refundCard,
    cashBack,
    selectedTip,
    tip,
    charge,
    cardFee,
    method,
    steps,
    bookFee,
    cardOk: isCardOk,
    isOverAgreed,
    tipCap,
    isTipTooHigh: method === "card" && tip > tipCap,
  };
};

/** The checkout outcome, and the status it leaves. */
export const getFinalized = (
  state: CheckoutState,
  booking: CheckoutBooking,
): Pick<CheckoutState, "done"> => {
  const money = getMoney(state, booking);

  return {
    done: {
      method: money.method,
      via: state.method === "link" ? state.linkVia : state.recordVia,
      charged: money.charge,
      tip: money.tip,
      refundAuto: money.refundCard,
      cashBack: money.cashBack,
    },
  };
};

/** The initial state for a host booking. */
export const getInitialCheckout = ({
  booking,
  start,
  done,
  refunded,
}: CheckoutSeedProps): CheckoutState => {
  const state: CheckoutState = {
    mode: booking.mode,
    paid: booking.paid,
    view: start || "items",
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
    tip: "none",
    tipCustom: "",
    tipOpen: false,
    method:
      booking.card && (booking.mode === "deposit" || booking.mode === "card")
        ? "card"
        : "link",
    linkVia: "email",
    recordVia: "cash",
    tipReceived: "",
    decline: null,
    tries: 2,
    busy: false,
    fromDone: false,
    isResendFromReceipt: false,
    refund: EMPTY_REFUND,
    refundFinal: 0,
    refunded: 0,
    refundLast: "",
    dialog: null,
    resendVia: "email",
    toast: "",
    done: null,
  };

  if (Array.isArray(booking.lines))
    state.lines = booking.lines.map((line, index) => ({
      id: index + 1,
      adjustment: 0,
      reason: "",
      name: "",
      subtitle: "",
      base: 0,
      ...line,
    }));

  if (done) {
    state.done = {
      method: done.method ?? "none",
      via: done.via ?? "",
      charged: done.charged ?? 0,
      tip: done.tip ?? 0,
      refundAuto: done.refundAuto ?? 0,
      cashBack: done.cashBack ?? 0,
    };

    if (done.tip && typeof done.tip === "number") {
      state.tip = "custom";
      state.tipCustom = String(done.tip);
    }

    if (done.method === "record") {
      state.method = "record";
      state.recordVia = (done.via as RecordVia) || "cash";
    }

    if (done.method === "link")
      state.linkVia = (done.via as "sms" | "email") || "email";
  }

  state.refunded = refunded || 0;

  return state;
};

/** How much can be refunded through the platform, or recorded as refunded off it. */
export const getRefundContext = (
  state: CheckoutState,
): { platform: number; off: number } => {
  const done = state.done ?? { charged: 0, refundAuto: 0, method: "none" };

  return {
    platform:
      state.paid -
      (done.refundAuto || 0) +
      (done.method === "card" || done.method === "link" ? done.charged : 0),
    off: done.method === "record" ? done.charged : 0,
  };
};

export const getRefundCap = (state: CheckoutState) => {
  const refundContext = getRefundContext(state);
  const isOffPlatform = !(refundContext.platform > 0);

  const refundCapAll = roundToPence(
    isOffPlatform ? refundContext.off : refundContext.platform,
  );

  return {
    isOffPlatform,
    refundCapAll,
    refundCap: roundToPence(refundCapAll - state.refunded),
  };
};
