// Bookings that changed while Studio was open, or an older page of Past → Studio's state.
import type { StudioBookingRow } from "../../../lib/studio-api/bookings";
import type { StudioClientRow } from "../../../lib/studio-api/clients";
import { toStudioClient } from "../clients/records";
import type { StudioState } from "../core/types";
import {
  getLocalId,
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

    const localId = getLocalId(row.id);

    const others = merged.bookings.filter(
      ({ id, remoteId }) => remoteId !== row.id && id !== localId,
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

export const mergeClientRows = (
  {
    bookingClients,
    extraClients,
  }: Pick<StudioState, "bookingClients" | "extraClients">,
  rows: StudioClientRow[],
) => {
  const fresh = rows.map(toStudioClient);
  const ids = new Set(fresh.map(({ id }) => id));

  return {
    bookingClients: [
      ...fresh,
      ...bookingClients.filter(({ id }) => !ids.has(id)),
    ],
    extraClients: extraClients.filter(({ id }) => !ids.has(id)),
  };
};
