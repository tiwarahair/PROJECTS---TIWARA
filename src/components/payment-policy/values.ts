import type {
  FeeValues,
  PolicyFormValues,
  PolicyPreset,
  PolicyValue,
} from "./types";

interface InitialPolicy {
  saved: PolicyFormValues;
  values: PolicyFormValues;
}

const getBasePolicy = (): PolicyFormValues => ({
  mode: "deposit",
  deposit: "20",
  refundable: true,
  freeWindowHours: 48,
  late: { on: false, kind: "keep", percent: "50" },
  noShow: { on: false, kind: "keep", percent: "50" },
  grace: 0,
  extras: [],
});

const getSeededFee = (
  fee: FeeValues,
  seeded?: Partial<PolicyValue["late"]>,
): FeeValues =>
  seeded
    ? {
        ...fee,
        ...seeded,
        percent: String(seeded.percent != null ? seeded.percent : fee.percent),
      }
    : fee;

export const getInitialPolicy = (
  preset: PolicyPreset,
  value?: Partial<PolicyValue>,
): InitialPolicy => {
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
      state.extras = value.extras.map(({ type, text }) => ({ type, text }));

    return { saved: state, values: state };
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
      { type: "prep", text: "Please arrive with clean, product-free hair." },
    ];
  }

  return { saved: getBasePolicy(), values: state };
};

export const getPercent = ({ percent }: FeeValues): number => {
  const value = parseInt(percent, 10);

  return isNaN(value) ? 0 : value;
};

export const getPolicyOutput = (state: PolicyFormValues): PolicyValue => {
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
