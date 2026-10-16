import { ICONS } from "../data";
import { row } from "../view";
import type { DetailBuilder, DetailContext } from "./context";
import { formatMoney } from "../../../utils/money";

const getWaivedWhat = ({ checkout: { state }, view }: DetailContext) => {
  const { name, fee, feeExtra } = view;

  if (state.mode === "deposit")
    return state.isNonRefundable
      ? `${name} wasn’t charged the extra ${formatMoney(feeExtra)}. Her ${formatMoney(state.paid)} deposit is non-refundable and was kept.`
      : `Her ${formatMoney(state.paid)} deposit was refunded and she wasn’t charged anything else.`;

  if (state.mode === "full")
    return `The ${formatMoney(fee)} was refunded to her card.`;

  return `${name} wasn’t charged.`;
};

export const NO_SHOW_DETAILS = {
  feePending: ({ checkout: { setState, booking }, view, feeRows }) => ({
    badges: [
      { label: "No-show · Fee pending", tone: "rust", icon: ICONS.clock },
    ],
    panel: {
      tone: "neutral",
      icon: ICONS.clock,
      title: `${formatMoney(view.fee)} no-show fee`,
      body: `${view.name} didn’t turn up on ${booking.day}. The fee is charged automatically in 18h unless you waive it.`,
    },
    rows: feeRows,
    total: { label: "No-show fee", value: formatMoney(view.fee) },
    actions: [
      {
        label: `Waive ${formatMoney(view.fee)} fee (applies in 18h)`,
        run: () => setState({ dialog: "waive" }),
        kind: "secondary",
      },
    ],
    hasUndo: true,
  }),
  feeWaived: (context) => ({
    badges: [
      { label: "No-show · Fee waived", tone: "neutral", icon: ICONS.check },
    ],
    panel: {
      tone: "neutral",
      icon: ICONS.check,
      title: "Fee waived",
      body: `You waived the ${formatMoney(context.view.fee)} fee today at 16:20. ${getWaivedWhat(context)} The booking fee isn’t refunded.`,
    },
    hasUndo: true,
  }),
  feeUnpaid: ({ checkout, view, feeRows }) => {
    const { state, setState, showToast, booking } = checkout;
    const { name, fee, feeExtra, cardText } = view;
    const feeExtraText = formatMoney(feeExtra);

    const depositNote =
      state.paid > 0
        ? ` Her ${formatMoney(state.paid)} deposit is kept towards it.`
        : "";

    return {
      badges: [
        { label: "No-show · Fee unpaid", tone: "red", icon: ICONS.alert },
      ],
      panel: {
        tone: "red",
        icon: ICONS.alert,
        title: "Card declined: insufficient funds",
        body: `${feeExtraText} of ${name}’s ${formatMoney(fee)} fee couldn’t be charged to ${cardText}.${depositNote}`,
      },
      rows: feeRows,
      total: { label: "No-show fee", value: formatMoney(fee) },
      actions: [
        {
          label: "Retry card (1 of 2 left)",
          run: () => setState({ dialog: "retryFee" }),
          kind: "primary",
        },
        {
          label: "Send payment link",
          run: () =>
            showToast(
              `Payment link for ${feeExtraText} sent to ${booking.phone}`,
            ),
          kind: "secondary",
        },
        {
          label: "Record as paid",
          run: () => setState({ dialog: "recordFee" }),
          kind: "secondary",
        },
        {
          label: "Waive fee",
          run: () => setState({ dialog: "waive" }),
          kind: "ghost",
        },
      ],
    };
  },
  feeCollected: ({
    checkout: { state },
    view,
    feeRows,
    refundBadges,
    refundActions,
  }) => ({
    badges: [
      { label: "No-show · Fee collected", tone: "green", icon: ICONS.check },
      ...refundBadges,
    ],
    rows:
      state.refunded > 0
        ? [
            ...feeRows,
            row("Refund", state.refundLast, formatMoney(-state.refunded)),
          ]
        : feeRows,
    total: {
      label: "Fee collected",
      value: formatMoney(view.fee - state.refunded),
    },
    actions: refundActions,
  }),
} satisfies Record<
  "feePending" | "feeWaived" | "feeUnpaid" | "feeCollected",
  DetailBuilder
>;
