import { ICONS } from "../data";
import { getAdjustNote, row } from "../view";
import type { CheckoutViewModel } from "../view";
import type { CheckoutController } from "../use-checkout";
import type { Badge, Detail, DetailAction } from "./types";
import { formatMoney } from "../../../utils/money";

export const getContext = (
  checkout: CheckoutController,
  view: CheckoutViewModel,
) => {
  const { state, setState, goTo } = checkout;
  const { cardText, fee, feeExtra, refundCap, modeLabel } = view;
  const { booking } = checkout;

  const chargeLabel =
    state.status === "feeCollected" ? "Charged to card" : "To charge to card";

  const getFeeRows = () => {
    if (state.mode === "deposit")
      return [
        row(
          "Deposit kept",
          `${cardText} · paid ${booking.paidOn}`,
          formatMoney(state.paid),
        ),
        row(
          state.status === "feeUnpaid" ? "Unpaid" : chargeLabel,
          cardText,
          formatMoney(feeExtra),
          state.status === "feeUnpaid",
        ),
      ];

    if (state.mode === "full")
      return [
        row("Kept from full payment", cardText, formatMoney(fee)),
        row("Refunded", cardText, formatMoney(state.paid - fee)),
      ];

    return [row(chargeLabel, cardText, formatMoney(fee))];
  };

  const openRefund = () => {
    setState({
      refundKind: "full",
      refundAmount: "",
      refundReason: "",
      refundTried: false,
    });

    goTo("refund", 1);
  };

  return {
    checkout,
    view,
    lineRows: state.lines.map((line) =>
      row(
        line.name,
        line.adjustment ? getAdjustNote(line) : line.subtitle,
        formatMoney(line.base + line.adjustment),
      ),
    ),
    modeBadge: { label: modeLabel, tone: "neutral", icon: ICONS.card } as Badge,
    refundBadges: (state.refunded > 0
      ? [
          {
            label:
              refundCap <= 0
                ? "Refunded"
                : `Partially refunded ${formatMoney(state.refunded)}`,
            tone: "neutral",
            icon: ICONS.returnArrow,
          },
        ]
      : []) as Badge[],
    feeRows: getFeeRows(),
    refundActions: (refundCap > 0
      ? [{ label: "Refund", run: openRefund, kind: "secondary" }]
      : []) as DetailAction[],
  };
};

export type DetailContext = ReturnType<typeof getContext>;

export type DetailBuilder = (context: DetailContext) => Partial<Detail>;
