import { undoNoShow } from "../../../../../lib/studio-api/bookings";
import { reopenStudioBooking } from "../../../../../lib/studio-api/booking-writes";
import { SaveError } from "../../../../../lib/studio-writes";
import { waiveFee as waiveFeeRemote } from "../../../../../lib/studio-api/money";
import { getWaiveConfirm } from "../../../core/model";
import { roundToPence } from "../../../../../utils/money";
import { getRefundTag } from "./context";
import type { PastContext } from "./context";

// >> "send a new link" on a booking nobody confirmed in time; the server checks the time is still free
const getReopen = ({ actions, row, client, startBusy }: PastContext) => {
  const { remoteId, startsAt } = row;

  if (
    !row.autoCancelled ||
    !startsAt ||
    Date.parse(startsAt) - Date.now() <= 2 * 3600000
  )
    return null;

  const first = (client.name || "the client").split(" ")[0];

  return {
    action: () =>
      startBusy(reopenStudioBooking)(remoteId).then(
        () => {
          actions.closeSheet();
          actions.showToast(`New link sent to ${first}`);
        },
        (error: unknown) =>
          actions.showToast(
            error instanceof SaveError
              ? error.message
              : "That didn’t work. Try again.",
          ),
      ),
    actionLabel: "Send a new link",
    actionHint: `Asks ${first} to confirm again, if the time is still free.`,
  };
};

const getUndo = ({
  studio,
  state,
  setState,
  actions,
  row,
  isFresh,
  hoursLeft,
}: PastContext) => {
  const { original } = row;

  // a settled or waived fee can't be undone, so neither can the no-show
  if (
    !isFresh ||
    row.status !== "No show" ||
    !original ||
    row.feeUnpaid ||
    row.waived
  )
    return { action: null, actionLabel: "", actionHint: "" };

  return {
    action: () => {
      setState({
        bookings: state.bookings.concat([original]),
        pastNew: state.pastNew.filter(({ pastId }) => pastId !== row.pastId),
      });

      studio.context.sync.save(() => undoNoShow(row.remoteId), {
        bookings: state.bookings,
        pastNew: state.pastNew,
      });

      actions.closeSheet();
      actions.showToast("Booking restored");
    },
    actionLabel: "Undo no-show",
    actionHint: `Puts the booking back. Available for ${hoursLeft}h.`,
  };
};

const getFeeAction = (
  {
    state,
    setState,
    actions,
    row,
    client,
    isFresh,
    hoursLeft,
    isKept,
    patch,
    saveFee,
  }: PastContext,
  feeLeft: number,
) => {
  if (!isKept) return { feeAction: null, feeActionLabel: "" };

  const pendingNote = row.feePending ? ` (applies in ${hoursLeft}h)` : "";

  const waiveFee = () => {
    const previous = state.pastNew;

    setState({ confirm: null });

    patch((current) => ({
      waived: true,
      feePending: false,
      meta: isFresh ? "Fee waived" : "Refunded",
      note:
        (current.note || "").replace(
          / ?£[\d.]+ (deposit kept( as (a )?fee)?|charged)\.?/,
          "",
        ) +
        (isFresh ? " Fee waived, client refunded." : " Fee refunded later."),
    }));

    const refundLead = isFresh ? "Fee waived. " : "Refunded. ";
    const clientFirst = (client.name || "").split(" ")[0];

    actions.showToast(`${refundLead}${clientFirst} gets ${row.feeLabel} back`);
    saveFee(waiveFeeRemote, previous);
  };

  const getAction = () => {
    if (isFresh)
      return () =>
        setState({
          confirm: getWaiveConfirm(state, row, client, isFresh, waiveFee),
        });

    return feeLeft > 0 ? () => setState({ pastCheckoutPanel: "refund" }) : null;
  };

  return {
    feeAction: getAction(),
    feeActionLabel: isFresh
      ? `Waive ${row.feeLabel} fee${pendingNote}`
      : "Refund",
  };
};

export const getActionsView = (context: PastContext) => {
  const {
    row,
    isCompleted,
    isFresh,
    hoursLeft,
    isKept,
    feeNumber,
    why,
    isBusy,
  } = context;

  const feeLeft = roundToPence(feeNumber - (row.refunded || 0));

  const { action, actionLabel, actionHint } =
    getReopen(context) ?? getUndo(context);

  // the fee gets its own action so a no-show can offer both "Undo no-show" and "Waive fee"
  const { feeAction, feeActionLabel } = getFeeAction(context, feeLeft);
  // a pending/kept fee with an action collapses note + action into one panel
  const isMerged = isKept && !!feeAction;
  const hasFee = (row.feeKept || row.feePending) && !row.waived;

  const getActionTitle = () => {
    if (hasFee) {
      const feeKind =
        row.status === "No show" ? "no-show fee" : "late cancellation fee";

      return `${row.feeLabel} ${feeKind}`;
    }

    if (actionLabel === "Send a new link") return "Not confirmed in time";

    return actionLabel === "Undo no-show" ? "Marked as a no-show" : "";
  };

  const feeTiming =
    row.feePending && isFresh
      ? `Charged automatically in ${hoursLeft}h.`
      : "Kept from the deposit.";

  return {
    note: row.note || "",
    hasNote: !!row.note && !isMerged,
    hasAction: !!action,
    actionHasText: !isMerged,
    feeMerge: isMerged,
    feeAction,
    feeActionLabel,
    feeReason:
      (row.note || why) +
      (row.feePending && isFresh
        ? ` Charged automatically in ${hoursLeft}h unless you waive it.`
        : ""),
    feeRefundTag: isCompleted ? "" : getRefundTag(row.refunded || 0, feeLeft),
    action,
    isActionBusy: isBusy,
    actionLabel,
    actionTitle: getActionTitle(),
    actionReason: hasFee ? `${why} ${feeTiming}` : actionHint,
  };
};
