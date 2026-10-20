import { fetchStudioBooking } from "../../../../../lib/studio-api/bookings";
import { parseAmountLabel } from "../../../core/format";
import { getClient } from "../../../core/model";
import type { PastRecord } from "../../../core/types";
import type { StudioController } from "../../../core/use-studio";
import { mergeBookingRows } from "../../live-records";

export const DAY_MS = 86400000;

export const RECORDED_ONLY =
  "Recorded only, no money moves through Tiwára’s House.";

export const getRefundTag = (refunded: number, left: number) => {
  if (refunded > 0)
    return left <= 0 ? "Refunded" : `Partially refunded £${refunded}`;

  return "";
};

export const getContext = (studio: StudioController, row: PastRecord) => {
  const { state, setState, actions, seedPast } = studio;
  const client = getClient(state, row.client);
  const isFresh = !!row.at && Date.now() - row.at < DAY_MS;

  const patch = (value: Parameters<typeof actions.patchPast>[1]) =>
    actions.patchPast(row.pastId, value, seedPast);

  const settle = (value: Partial<PastRecord>, message: string) => {
    setState({ confirm: null });
    patch(value);
    actions.showToast(message);
  };

  /** Saves a real booking's fee change (after any save before it); a failure puts the row back. */
  const saveFee = (
    task: (bookingId: string) => Promise<unknown>,
    previous: PastRecord[],
  ) => {
    const { remoteId } = row;

    if (remoteId)
      studio.context.sync?.save(() => task(remoteId), { pastNew: previous });
  };

  // then reloads the booking, as the server may move it (back to Due for checkout, say)
  const saveAndRefresh = (task: (bookingId: string) => Promise<unknown>) =>
    saveFee(async (bookingId) => {
      await task(bookingId);

      const fresh = await fetchStudioBooking(bookingId);

      if (fresh) setState((current) => mergeBookingRows(current, [fresh]));
    }, state.pastNew);

  return {
    studio,
    state,
    setState,
    actions,
    row,
    client,
    isCompleted: row.status === "Completed",
    isFresh,
    hoursLeft: isFresh
      ? Math.max(
          1,
          Math.round((DAY_MS - (Date.now() - (row.at || 0))) / 3600000),
        )
      : 0,
    isKept: (row.feeKept || row.feePending) && !row.waived && !row.feeUnpaid,
    feeNumber: parseAmountLabel(row.feeLabel),
    why:
      row.status === "No show"
        ? "They didn’t turn up."
        : `Cancelled inside your ${state.policy.window}h window.`,
    patch,
    settle,
    saveFee,
    saveAndRefresh,
    firstName: (fallback: string) =>
      (client.name || fallback).split(" ")[0] ?? "",
  };
};

export type PastContext = ReturnType<typeof getContext>;
