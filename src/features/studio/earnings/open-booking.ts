import type { LedgerRow } from "../../../lib/studio-api/earnings";
import { openBookingById } from "../bookings/open-by-id";
import type { StudioController } from "../core/use-studio";

/** Earnings → Appointment: opens the booking the money line belongs to. */
export const openLedgerBooking = (
  studio: StudioController,
  lines: LedgerRow[],
  bookingRef: string,
) => {
  const line = lines.find(({ booking_ref: ref }) => ref === bookingRef);

  if (line) void openBookingById(studio, line.booking_id);
  else studio.actions.showToast("That booking couldn’t be opened.");
};
