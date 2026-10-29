import { markNoShow, undoNoShow } from "../../../../lib/studio-api/bookings";
import { getKeptDeposit } from "../../core/model";
import type { SheetContext } from "./context";

const getNoShowChoices = ({ noShowFee }: SheetContext) =>
  noShowFee.amount > 0
    ? [
        {
          id: "fee",
          label: `Charge the ${noShowFee.label} no-show fee`,
          subtitle: noShowFee.subtitle ?? "",
        },
        { id: "none", label: "No charge", subtitle: noShowFee.refund },
      ]
    : [
        {
          id: "none",
          label: "No charge",
          subtitle: `Your payment policy has no no-show fee. ${noShowFee.refund}.`,
        },
      ];

export const getNoShowView = (context: SheetContext) => {
  const { state, setState, actions, noShowFee } = context;

  const choice =
    noShowFee.amount > 0 && state.noShowCharge !== "none" ? "fee" : "none";

  return {
    noShowOptions: getNoShowChoices(context).map((option) => ({
      ...option,
      isOn: choice === option.id,
      pick: () => setState({ noShowCharge: option.id }),
    })),
    confirmNoShow: () => {
      const isCharging = choice === "fee";

      context.finish(
        {
          status: "No show",
          meta: isCharging ? "Fee pending" : "No charge",
          feeKept: isCharging,
          feePending: isCharging,
          feeLabel: noShowFee.label,
          note: `Client did not attend. ${isCharging ? noShowFee.subtitle : noShowFee.refund}.`,
          ...(isCharging ? {} : getKeptDeposit(noShowFee.kept)),
        },
        "Marked as no-show",
        {
          save: (remoteId) => markNoShow(remoteId, isCharging),
          undo: undoNoShow,
        },
      );

      actions.closeSheet();
    },
  };
};
