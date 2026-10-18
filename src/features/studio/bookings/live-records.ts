// Bookings that changed while Studio was open, or an older page of Past → Studio's state.
import type { StudioBookingRow } from "../../../lib/studio-api/bookings";
import type { StudioState } from "../core/types";
import {
  isActiveRow,
  isPastRow,
  sortPast,
  toBookingClient,
  toPastRecord,
  toStudioBooking,
} from "./records";

type BookingLists = Pick<
  StudioState,
  "bookings" | "pastNew" | "bookingClients"
>;

const addClient = (
  clients: BookingLists["bookingClients"],
  row: StudioBookingRow,
) => {
  const client = toBookingClient(row);

  return clients.some(({ id }) => id === client.id)
    ? clients
    : [...clients, client];
};

/** Each row replaces its booking wherever it was: upcoming stays upcoming, a finished one moves to Past. */
export const mergeBookingRows = (
  { bookings, pastNew, bookingClients }: BookingLists,
  rows: StudioBookingRow[],
): BookingLists => {
  let merged: BookingLists = { bookings, pastNew, bookingClients };

  for (const row of rows) {
    const isActive = isActiveRow(row);

    // anything still being paid for isn't Studio's yet
    if (!isActive && !isPastRow(row)) continue;

    const others = merged.bookings.filter(
      ({ remoteId }) => remoteId !== row.id,
    );

    const otherPast = merged.pastNew.filter(({ pastId }) => pastId !== row.id);

    merged = {
      bookings: isActive ? [...others, toStudioBooking(row)] : others,
      pastNew: isActive
        ? otherPast
        : sortPast([toPastRecord(row), ...otherPast]),
      bookingClients: addClient(merged.bookingClients, row),
    };
  }

  return merged;
};
