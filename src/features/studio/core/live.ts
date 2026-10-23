// While Studio is open: bookings and fees that change elsewhere (an online booking, a client cancelling or moving, a fee settling) are fetched again and merged in
import {
  fetchStudioBooking,
  fetchStudioBookings,
} from "../../../lib/studio-api/bookings";
import type { StudioBookingRow } from "../../../lib/studio-api/bookings";
import { supabase } from "../../../lib/supabase";
import { mergeBookingRows } from "../bookings/live-records";
import { isWaiting } from "../bookings/save";
import {
  getLocalId,
  isActiveRow,
  isPastRow,
  toBookingClient,
  toStudioBooking,
} from "../bookings/records";
import type { StudioContext } from "./actions";
import { dayInfo } from "./format";

interface LiveStudio {
  context: StudioContext;
  showToast: (message: string) => void;
  closeSheet: () => void;
}

const getNewBookingToast = (row: StudioBookingRow) => {
  const { dayOffset, time } = toStudioBooking(row);

  return `New booking: ${toBookingClient(row).first}, ${dayInfo(dayOffset).label} ${time}`;
};

export const watchStudio = (stylistId: string, getStudio: () => LiveStudio) => {
  const apply = (rows: StudioBookingRow[]) => {
    const { context, showToast, closeSheet } = getStudio();
    const state = context.getState();

    const known = new Set<string | number | undefined>([
      ...state.bookings.map(({ remoteId }) => remoteId),
      ...state.pastNew.map(({ pastId }) => pastId),
    ]);

    const openId =
      state.sheet === "booking"
        ? state.bookings.find(({ id }) => id === state.sheetBookingId)?.remoteId
        : undefined;

    // the open booking's own checkout finishing: it stays put until they leave the checkout, which reloads it
    const isOwnCheckout = (row: StudioBookingRow) =>
      row.id === openId && row.status === "completed" && !row.unpaid_at;

    // a booking with changes still saving gets the server's copy once they're done
    context.applyState((current) =>
      mergeBookingRows(
        current,
        rows.filter(
          (row) => !isOwnCheckout(row) && !isWaiting(getLocalId(row.id)),
        ),
      ),
    );

    for (const row of rows) {
      if (!known.has(row.id) && isActiveRow(row) && row.created_by === "client")
        showToast(getNewBookingToast(row));

      // the booking open in front of them was cancelled (a completed one is their own checkout finishing)
      if (row.id === openId && isPastRow(row) && row.status !== "completed") {
        closeSheet();

        if (row.cancelled_by === "client")
          showToast(`${toBookingClient(row).first} cancelled this booking`);
      }
    }
  };

  // several changes to one booking arrive close together; only the newest fetch's answer is used
  const latestFetch = new Map<string, number>();

  const refreshOne = async (bookingId: string) => {
    const ticket = (latestFetch.get(bookingId) ?? 0) + 1;

    latestFetch.set(bookingId, ticket);

    const row = await fetchStudioBooking(bookingId).catch(() => null);

    if (row && latestFetch.get(bookingId) === ticket) apply([row]);
  };

  const refreshAll = async () => {
    const latest = await fetchStudioBookings(stylistId).catch(() => null);

    if (latest) apply([...latest.active, ...latest.past]);
  };

  const channel = supabase
    .channel(`studio:${stylistId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
        filter: `stylist_id=eq.${stylistId}`,
      },
      ({ new: row }) => {
        if ("id" in row) void refreshOne(String(row.id));
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "booking_fees" },
      ({ new: row }) => {
        if ("booking_id" in row) void refreshOne(String(row.booking_id));
      },
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "refunds" },
      ({ new: row }) => {
        if ("booking_id" in row) void refreshOne(String(row.booking_id));
      },
    )
    .subscribe();

  // a sleeping tab can miss changes, so look again when it's back
  const onVisible = () => {
    if (document.visibilityState === "visible") void refreshAll();
  };

  document.addEventListener("visibilitychange", onVisible);

  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    void supabase.removeChannel(channel);
  };
};
