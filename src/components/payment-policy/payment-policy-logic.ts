// PaymentPolicy state, validation and save-bar summary.
import type { Policy, PolicyMode } from "../../types/policy";

export type PolicyPreset =
  "default" | "full" | "card" | "none" | "error" | "unsaved";
export type ExtraType = "prep" | "custom";

export interface FeeState {
  on: boolean;
  kind: "keep" | "pct";
  percent: string;
}

interface ExtraState {
  id: number;
  type: ExtraType;
  text: string;
}

export interface PolicyFormState {
  mode: PolicyMode;
  deposit: string;
  refundable: boolean;
  freeWindowHours: number;
  late: FeeState;
  noShow: FeeState;
  grace: number;
  extras: ExtraState[];
  saved: string;
  flash: boolean;
  nextExtraId: number;
}

/** What onSave receives; also accepted back as `value` to seed the form. */
export interface PolicyValue {
  mode: PolicyMode;
  deposit: number;
  refundable: boolean;
  window: number;
  grace: number;
  late: { on: boolean; kind: "keep" | "pct"; percent: number };
  noShow: { on: boolean; kind: "keep" | "pct"; percent: number };
  extras: { type: ExtraType; text: string }[];
}

export const EXTRAS_LIMIT = 300;
/** The client preview's example service price. */
export const PREVIEW_PRICE = 100;

type PolicyFields = Omit<PolicyFormState, "saved" | "flash" | "nextExtraId">;

const getBasePolicy = (): PolicyFields => ({
  mode: "deposit",
  deposit: "20",
  refundable: true,
  freeWindowHours: 48,
  late: { on: false, kind: "keep", percent: "50" },
  noShow: { on: false, kind: "keep", percent: "50" },
  grace: 0,
  extras: [],
});

/** Compares saved and current settings. */
export const getPolicyKey = (state: PolicyFields): string =>
  JSON.stringify([
    state.mode,
    state.deposit,
    state.refundable,
    state.freeWindowHours,
    state.late,
    state.noShow,
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
        percent: String(seeded.percent != null ? seeded.percent : fee.percent),
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

    if (value.deposit != null) state.deposit = String(value.deposit);

    if (value.refundable != null) state.refundable = !!value.refundable;

    if (value.window != null) state.freeWindowHours = value.window;

    if (value.grace != null) state.grace = value.grace;

    state.late = getSeededFee(state.late, value.late);
    state.noShow = getSeededFee(state.noShow, value.noShow);

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
      nextExtraId: state.extras.length + 2,
    };
  }

  if (preset === "full" || preset === "card" || preset === "none")
    state.mode = preset;

  if (preset === "error") {
    state.deposit = "40";
    state.refundable = false;
  }

  if (preset === "unsaved") {
    state.deposit = "25";
    state.late = { on: true, kind: "pct", percent: "50" };
    state.noShow = { on: true, kind: "keep", percent: "50" };

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
    nextExtraId: 2,
  };
};

const getPercent = ({ percent }: FeeState): number => {
  const value = parseInt(percent, 10);

  return isNaN(value) ? 0 : value;
};

export const getDepositError = ({
  mode,
  deposit: depositInput,
  refundable,
}: PolicyFields): string => {
  if (mode !== "deposit") return "";

  const deposit = parseInt(depositInput, 10);

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

  const value = parseInt(fee.percent, 10);

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
  const deposit = parseInt(state.deposit, 10);

  return {
    mode: state.mode,
    depositPercent: isNaN(deposit) ? 0 : Math.min(deposit, 100),
    refundable: state.refundable,
    freeWindowHours: state.freeWindowHours,
    late: {
      on: state.late.on,
      kind: state.late.kind,
      percent: getPercent(state.late),
    },
    noShow: {
      on: state.noShow.on,
      kind: state.noShow.kind,
      percent: getPercent(state.noShow),
    },
    graceMinutes: state.grace,
    extras: [],
  };
};

const getWindowText = (hours: number): string => {
  if (hours < 1) return "30 mins";

  return hours === 1 ? "1 hour" : `${hours}h`;
};

const getExistingBookingsText = (bookingsCount: number): string => {
  if (bookingsCount === 0) return "";

  if (bookingsCount === 1)
    return " Your 1 existing booking keeps its current policy.";

  return ` Your ${bookingsCount} existing bookings keep their current policy.`;
};

/** "20% deposit, free cancellation until 48h before, …" for the save bar. */
export const getPolicySummary = (state: PolicyFields): string => {
  const { mode, refundable, freeWindowHours, late, noShow } = state;
  const deposit = parseInt(state.deposit, 10);
  const windowText = getWindowText(freeWindowHours);
  const depositValue = isNaN(deposit) ? 0 : deposit;
  const refundNote = refundable ? "" : ", non-refundable";

  const parts = [
    {
      deposit: `${depositValue}% deposit${refundNote}`,
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
    const describe = (fee: FeeState) => {
      if (!fee.on) return null;

      return mode === "deposit" && fee.kind === "keep"
        ? "deposit"
        : `${getPercent(fee)}%`;
    };

    const lateText = describe(late);
    const noShowText = describe(noShow);

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
  `This applies to new bookings only.${getExistingBookingsText(bookingsCount)}`;

export const getPolicyOutput = (state: PolicyFields): PolicyValue => {
  const deposit = parseInt(state.deposit, 10);

  return {
    mode: state.mode,
    deposit: isNaN(deposit) ? 0 : deposit,
    refundable: state.refundable,
    window: state.freeWindowHours,
    grace: state.grace,
    late: {
      on: state.late.on,
      kind: state.late.kind,
      percent: getPercent(state.late),
    },
    noShow: {
      on: state.noShow.on,
      kind: state.noShow.kind,
      percent: getPercent(state.noShow),
    },
    extras: state.extras
      .filter(({ text }) => text.trim())
      .map(({ type, text }) => ({ type, text: text.trim() })),
  };
};
