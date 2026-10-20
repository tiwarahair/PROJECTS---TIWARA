import { correctRecordedPayment } from "../../../../../lib/studio-api/checkout";
import { parseNumber } from "../../../core/format";
import type { PastContext } from "./context";

export const CORRECT_VIAS = [
  ["cash", "Cash"],
  ["bank", "Bank transfer"],
  ["reader", "Card reader"],
] as const;

// recorded payments can be fixed until the end of the month after they were taken
const isCorrectable = (takenAt: number) => {
  const taken = new Date(takenAt);

  return new Date(taken.getFullYear(), taken.getMonth() + 2, 1) > new Date();
};

const toPence = (pounds: number) => Math.round(pounds * 100);

export const getCorrectView = ({
  state,
  setState,
  actions,
  row,
  patch,
  saveFee,
}: PastContext) => {
  const payment = row.recordedPayment;
  const draft = state.correctPayment ?? null;
  const amount = parseNumber(draft?.amount ?? "");
  const tip = parseNumber(draft?.tip ?? "");

  const save = () => {
    if (!payment || !draft || amount <= 0 || tip > amount) return;

    const previous = state.pastNew;

    setState({ correctPayment: null });

    patch((current) => ({
      recordedPayment: { ...payment, amount, tip, via: draft.via },
      ...(current.checkout
        ? {
            checkout: {
              ...current.checkout,
              charged: amount,
              tip,
              via: draft.via,
            },
          }
        : {}),
    }));

    saveFee(
      () =>
        correctRecordedPayment(
          payment.id,
          toPence(amount),
          draft.via,
          toPence(tip),
        ),
      previous,
    );

    actions.showToast("Payment corrected");
  };

  return {
    canCorrect: !!payment && !!row.remoteId && isCorrectable(payment.takenAt),
    correctDraft: draft,
    isCorrectValid: amount > 0 && tip <= amount,
    openCorrect: () =>
      payment &&
      setState({
        correctPayment: {
          amount: String(payment.amount),
          tip: String(payment.tip),
          via: payment.via,
        },
      }),
    patchCorrect: (value: Partial<NonNullable<typeof draft>>) =>
      setState(({ correctPayment }) => ({
        correctPayment: correctPayment ? { ...correctPayment, ...value } : null,
      })),
    cancelCorrect: () => setState({ correctPayment: null }),
    saveCorrect: save,
  };
};
