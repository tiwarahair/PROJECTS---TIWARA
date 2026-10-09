// PaymentPolicy state, validation and save-bar summary (prototype PaymentPolicy.dc.html: base, key, init, renderVals).
import type { Policy, PolicyMode } from "../../types/policy";

export type PolicyPreset =
  "default" | "full" | "card" | "none" | "error" | "unsaved";
export type ExtraType = "prep" | "custom";

export interface FeeState {
  on: boolean;
  kind: "keep" | "pct";
  pct: string;
}

export interface ExtraState {
  id: number;
  type: ExtraType;
  text: string;
}

export interface PolicyFormState {
  mode: PolicyMode;
  dep: string;
  refundable: boolean;
  win: number;
  late: FeeState;
  ns: FeeState;
  grace: number;
  extras: ExtraState[];
  saved: string;
  flash: boolean;
  /** Next extra id. */
  nid: number;
}

/** What onSave receives; also accepted back as `value` to seed the form. */
export interface PolicyValue {
  mode: PolicyMode;
  deposit: number;
  refundable: boolean;
  window: number;
  grace: number;
  late: { on: boolean; kind: "keep" | "pct"; pct: number };
  ns: { on: boolean; kind: "keep" | "pct"; pct: number };
  extras: { type: ExtraType; text: string }[];
}

export const EXTRAS_LIMIT = 300;
/** The client preview's example service price. */
export const PREVIEW_PRICE = 100;

type PolicyFields = Omit<PolicyFormState, "saved" | "flash" | "nid">;

const getBasePolicy = (): PolicyFields => ({
  mode: "deposit",
  dep: "20",
  refundable: true,
  win: 48,
  late: { on: false, kind: "keep", pct: "50" },
  ns: { on: false, kind: "keep", pct: "50" },
  grace: 0,
  extras: [],
});

/** Compares saved and current settings (prototype key()). */
export const getPolicyKey = (state: PolicyFields): string =>
  JSON.stringify([
    state.mode,
    state.dep,
    state.refundable,
    state.win,
    state.late,
    state.ns,
    state.grace,
    state.extras.map(({ type, text }) => [type, text]),
  ]);

const getSeededFee = (
  fee: FeeState,
  seeded?: Partial<PolicyValue["late"]>,
): FeeState =>
  seeded
    ? {
        ...fee,
        ...seeded,
        pct: String(seeded.pct != null ? seeded.pct : fee.pct),
      }
    : fee;

export const getInitialPolicyState = (
  preset: PolicyPreset,
  value?: Partial<PolicyValue>,
): PolicyFormState => {
  const state = getBasePolicy();
  // seeded from the host's saved policy
  if (value) {
    if (value.mode) state.mode = value.mode;
    if (value.deposit != null) state.dep = String(value.deposit);
    if (value.refundable != null) state.refundable = !!value.refundable;
    if (value.window != null) state.win = value.window;
    if (value.grace != null) state.grace = value.grace;
    state.late = getSeededFee(state.late, value.late);
    state.ns = getSeededFee(state.ns, value.ns);
    if (Array.isArray(value.extras))
      state.extras = value.extras.map(({ type, text }, index) => ({
        id: index + 1,
        type,
        text,
      }));
    return {
      ...state,
      saved: getPolicyKey(state),
      flash: false,
      nid: state.extras.length + 2,
    };
  }
  if (preset === "full" || preset === "card" || preset === "none")
    state.mode = preset;
  if (preset === "error") {
    state.dep = "40";
    state.refundable = false;
  }
  if (preset === "unsaved") {
    state.dep = "25";
    state.late = { on: true, kind: "pct", pct: "50" };
    state.ns = { on: true, kind: "keep", pct: "50" };
    state.extras = [
      {
        id: 1,
        type: "prep",
        text: "Please arrive with clean, product-free hair.",
      },
    ];
  }
  return {
    ...state,
    saved: getPolicyKey(getBasePolicy()),
    flash: false,
    nid: 2,
  };
};

export const getPercent = ({ pct }: FeeState): number => {
  const value = parseInt(pct, 10);
  return isNaN(value) ? 0 : value;
};

export const getDepositError = ({
  mode,
  dep,
  refundable,
}: PolicyFields): string => {
  if (mode !== "deposit") return "";
  const deposit = parseInt(dep, 10);
  if (isNaN(deposit) || deposit < 1) return "Enter a deposit of at least 1%.";
  if (deposit > (refundable ? 50 : 25))
    return refundable
      ? "Refundable deposits can be up to 50%."
      : "Non-refundable deposits can be up to 25%. Lower it or make it refundable.";
  return "";
};

export const getFeeError = (mode: PolicyMode, fee: FeeState): string => {
  if (mode === "none" || !fee.on || (mode === "deposit" && fee.kind === "keep"))
    return "";
  const value = parseInt(fee.pct, 10);
  return isNaN(value) || value < 1 || value > 100
    ? "Enter a percentage from 1 to 100."
    : "";
};

export const getExtrasUsed = (extras: ExtraState[]): number => {
  let used = 0;
  for (const { text } of extras) used += text.length;
  return used;
};

/** The policy as the client-facing builder (utils/pricing policyLines) reads it, for a £100 example. */
export const getPreviewPolicy = (state: PolicyFields): Policy => {
  const deposit = parseInt(state.dep, 10);
  return {
    mode: state.mode,
    depositPct: isNaN(deposit) ? 0 : Math.min(deposit, 100),
    refundable: state.refundable,
    freeWindowHrs: state.win,
    late: {
      on: state.late.on,
      kind: state.late.kind,
      pct: getPercent(state.late),
    },
    noShow: { on: state.ns.on, kind: state.ns.kind, pct: getPercent(state.ns) },
    graceMins: state.grace,
    extras: [],
  };
};

/** "20% deposit, free cancellation until 48h before, …" for the save bar. */
export const getPolicySummary = (state: PolicyFields): string => {
  const { mode, refundable, win, late, ns } = state;
  const deposit = parseInt(state.dep, 10);
  const windowText = win < 1 ? "30 mins" : win === 1 ? "1 hour" : win + "h";
  const parts = [
    {
      deposit:
        (isNaN(deposit) ? 0 : deposit) +
        "% deposit" +
        (refundable ? "" : ", non-refundable"),
      full: "Full payment upfront",
      card: "Card saved at booking",
      none: "No protection",
    }[mode],
  ];
  parts.push(
    mode === "none"
      ? `cancel by ${windowText} before`
      : `free cancellation until ${windowText} before`,
  );
  if (mode !== "none") {
    const describe = (fee: FeeState) =>
      !fee.on
        ? null
        : mode === "deposit" && fee.kind === "keep"
          ? "deposit"
          : getPercent(fee) + "%";
    const lateText = describe(late);
    const noShowText = describe(ns);
    if (lateText && lateText === noShowText)
      parts.push(
        lateText === "deposit"
          ? "deposit kept for late cancellations and no-shows"
          : `${lateText} late cancellation and no-show fees`,
      );
    else {
      if (lateText)
        parts.push(
          lateText === "deposit"
            ? "deposit kept for late cancellations"
            : `${lateText} late cancellation fee`,
        );
      if (noShowText)
        parts.push(
          noShowText === "deposit"
            ? "deposit kept for no-shows"
            : `${noShowText} no-show fee`,
        );
      if (!lateText && !noShowText) parts.push("no fees");
    }
  }
  return parts.join(", ").replace(/^./, (first) => first.toUpperCase());
};

/** "This applies to new bookings only. Your 14 existing bookings keep …" */
export const getExistingNote = (bookingsCount = 14): string =>
  "This applies to new bookings only." +
  (bookingsCount === 0
    ? ""
    : bookingsCount === 1
      ? " Your 1 existing booking keeps its current policy."
      : " Your " +
        bookingsCount +
        " existing bookings keep their current policy.");

export const getPolicyOutput = (state: PolicyFields): PolicyValue => {
  const deposit = parseInt(state.dep, 10);
  return {
    mode: state.mode,
    deposit: isNaN(deposit) ? 0 : deposit,
    refundable: state.refundable,
    window: state.win,
    grace: state.grace,
    late: {
      on: state.late.on,
      kind: state.late.kind,
      pct: getPercent(state.late),
    },
    ns: { on: state.ns.on, kind: state.ns.kind, pct: getPercent(state.ns) },
    extras: state.extras
      .filter(({ text }) => text.trim())
      .map(({ type, text }) => ({ type, text: text.trim() })),
  };
};
