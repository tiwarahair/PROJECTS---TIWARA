import { fetchStudioBooking } from "../../../lib/studio-api/bookings";
import { getPastKey } from "../core/model";
import type { StudioState } from "../core/types";
import type { StudioController } from "../core/use-studio";
import { mergeBookingRows } from "./live-records";

// an older past booking isn't loaded yet, so it's fetched first
export const openBookingById = async (
  { context, actions }: StudioController,
  remoteId: string,
) => {
  const open = ({ bookings, pastNew }: StudioState) => {
    const booking = bookings.find(({ remoteId: id }) => id === remoteId);
    const past = pastNew.find(({ remoteId: id }) => id === remoteId);

    if (booking) actions.openSheet("booking", { sheetBookingId: booking.id });
    else if (past)
      actions.openSheet("past", { selectedPastId: getPastKey(past) });

    return !!booking || !!past;
  };

  if (open(context.getState())) return;

  const row = await fetchStudioBooking(remoteId).catch(() => null);

  if (row) context.applyState((current) => mergeBookingRows(current, [row]));

  if (!open(context.getState()))
    actions.showToast("That booking couldn’t be opened.");
};
