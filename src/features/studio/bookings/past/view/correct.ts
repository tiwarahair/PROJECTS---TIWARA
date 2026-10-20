import { correctRecordedPayment } from "../../../../../lib/studio-api/checkout";
import { toLondonTime } from "../../../../../utils/london-time";
import { roundToPence } from "../../../../../utils/money";
import { parseNumber } from "../../../core/format";
import { getCheckoutLabel } from "../../checkout-label";
import type { PastContext } from "./context";

export const CORRECT_VIAS = [
  ["cash", "Cash"],
  ["bank", "Bank transfer"],
  ["reader", "Card reader"],
] as const;

const toMonthNumber = (instant: Date) => {
  const [year = 0, month = 0] = toLondonTime(instant.toISOString())
    .date.split("-")
    .map(Number);

  return year * 12 + month;
};

// recorded payments can be fixed until the end of the month after they were taken, in UK time as the server counts
const isCorrectable = (takenAt: number) =>
  toMonthNumber(new Date()) - toMonthNumber(new Date(takenAt)) < 2;

const toPence = (pounds: number) => Math.round(pounds * 100);

export const getCorrectView = ({
  state,
  setState,
  actions,
  row,
  patch,
  saveAndRefresh,
}: PastContext) => {
  const payment = row.recordedPayment;
  const draft = state.correctPayment ?? null;
  const amount = parseNumber(draft?.amount ?? "");
  const tip = parseNumber(draft?.tip ?? "");

  const save = () => {
    if (!payment || !draft || amount <= 0 || tip > amount) return;

    setState({ correctPayment: null });

    patch((current) => {
      if (!current.checkout)
        return { recordedPayment: { ...payment, amount, tip, via: draft.via } };

      const checkout = {
        ...current.checkout,
        charged: roundToPence(
          current.checkout.charged - payment.amount + amount,
        ),
        tip: roundToPence(current.checkout.tip - payment.tip + tip),
        via: draft.via,
      };

      return {
        recordedPayment: { ...payment, amount, tip, via: draft.via },
        checkout,
        ...(checkout.method === "record"
          ? { meta: getCheckoutLabel(checkout) }
          : {}),
      };
    });

    saveAndRefresh(() =>
      correctRecordedPayment(
        payment.id,
        toPence(amount),
        draft.via,
        toPence(tip),
      ),
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
