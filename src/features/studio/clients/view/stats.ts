import { timeToMinutes } from "../../core/format";
import { getPastRows } from "../../core/model";
import type { PastRecord, StudioState } from "../../core/types";

/** A client's bookings, past visits and money. */
export const getClientStats = (
  state: StudioState,
  id: string | null,
  seed: PastRecord[],
) => {
  const depositShare = (parseFloat(String(state.policy?.deposit)) || 20) / 100;

  const upcoming = state.bookings
    .filter(
      (booking) =>
        booking.client === id &&
        (booking.dayOffset || 0) >= 0 &&
        booking.status !== "cancelled",
    )
    .sort(
      (first, second) =>
        (first.dayOffset || 0) - (second.dayOffset || 0) ||
        timeToMinutes(first.time) - timeToMinutes(second.time),
    );

  const past = getPastRows(state, seed).filter((row) => row.client === id);

  const getFee = (row: PastRecord) =>
    parseFloat(String(row.feeLabel || "").replace(/[^0-9.]/g, "")) ||
    Math.round(row.price * depositShare);

  let fees = 0;
  let refunds = 0;
  let deposits = 0;

  for (const row of past) {
    if (
      (row.feeKept || row.status === "No show") &&
      !row.waived &&
      !row.feePending
    )
      fees += getFee(row);

    if (row.status === "Cancelled" && (!row.feeKept || row.waived))
      refunds += Math.round(row.price * depositShare);

    if (row.status === "Completed")
      deposits += Math.round(row.price * depositShare);
  }

  for (const booking of upcoming)
    if (booking.paid === "deposit" || booking.paid === "full")
      deposits += Math.round(booking.price * depositShare);

  return {
    upcoming,
    past,
    noShows: past.filter(({ status }) => status === "No show").length,
    lateCancel: past.filter(
      ({ status, feeKept }) => status === "Cancelled" && feeKept,
    ).length,
    fees,
    refunds,
    deposits,
    unpaidFee: past.some(({ feePending, waived }) => feePending && !waived),
  };
};

export type ClientStats = ReturnType<typeof getClientStats>;
