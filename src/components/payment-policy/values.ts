import type { FeeValues, PolicyFormValues, PolicyValue } from "./types";

const toFeeValues = ({ percent, ...fee }: PolicyValue["late"]): FeeValues => ({
  ...fee,
  percent: String(percent),
});

export const toPolicyFormValues = ({
  mode,
  deposit,
  refundable,
  window: freeWindowHours,
  grace,
  late,
  noShow,
  extras,
}: PolicyValue): PolicyFormValues => ({
  mode,
  deposit: String(deposit),
  refundable,
  freeWindowHours,
  grace,
  late: toFeeValues(late),
  noShow: toFeeValues(noShow),
  extras: extras.map(({ type, text }) => ({
    key: crypto.randomUUID(),
    type,
    text,
  })),
});

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
