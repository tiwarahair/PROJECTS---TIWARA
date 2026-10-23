import {
  fetchPastBookings,
  setBookingStatus,
} from "../../../../lib/studio-api/bookings";
import { mergeBookingRows } from "../../bookings/live-records";
import { saveToBooking } from "../../bookings/save";
import { toIsoDate } from "../../../../utils/dates";
import { toDayOffset } from "../../bookings/records";
import type {
  PastRecord,
  SheetKind,
  StudioBooking,
  StudioState,
} from "../types";
import type { StudioContext } from "./context";

interface BookingDeps {
  showToast: (message: string, undo?: () => void) => void;
  openSheet: (type: SheetKind, extra?: Partial<StudioState>) => void;
  closeSheet: () => void;
}

interface RebookSource {
  service: string;
  client: string | null;
  price: number;
  stylistNote?: string;
  address?: string;
}

const isSavedStatus = (status: string): status is "arrived" | "confirmed" =>
  status === "arrived" || status === "confirmed";

export const createBookingActions = (
  { getState, setState, sync, memo }: StudioContext,
  { showToast, openSheet, closeSheet }: BookingDeps,
) => {
  const saveStatus = (
    booking: StudioBooking,
    status: string,
    revert: StudioBooking[],
  ) => {
    if (isSavedStatus(status))
      saveToBooking(
        { setState, sync },
        booking,
        (remoteId) => setBookingStatus(remoteId, status),
        { bookings: revert },
      );
  };

  const setStatus = (
    id: number,
    status: string,
    message: string,
    extra: Partial<StudioBooking> = {},
  ) => {
    const previous = getState().bookings;
    const booking = previous.find((item) => item.id === id);

    if (!booking) return;

    const next = previous.map((item) =>
      item.id === id ? { ...item, status, ...extra } : item,
    );

    setState({ bookings: next });
    saveStatus(booking, status, previous);

    showToast(message, () => {
      setState({ bookings: previous });
      saveStatus(booking, booking.status, next);
    });
  };

  const patchPast = (
    pastId: string | number | undefined,
    patch: Partial<PastRecord> | ((row: PastRecord) => Partial<PastRecord>),
  ) => {
    const { pastNew } = getState();

    setState({
      pastNew: pastNew.map((row) =>
        row.pastId === pastId
          ? { ...row, ...(typeof patch === "function" ? patch(row) : patch) }
          : row,
      ),
    });
  };

  const rebookFrom = (booking: RebookSource) => {
    const service = getState().services.find(
      ({ name }) => name === booking.service,
    );

    closeSheet();

    window.setTimeout(
      () =>
        openSheet("add", {
          addRebook: true,
          addStep: service ? 3 : 2,
          addClient: booking.client || null,
          addWalkIn: !booking.client,
          addService: service ? service.id : null,
          addPrice: booking.price,
          addNote: booking.stylistNote || "",
          addAddress: booking.address || "",
        }),
      230,
    );
  };

  /** Past midnight, real bookings move to their new day offsets. */
  const followToday = () => {
    const today = toIsoDate(new Date());

    if (memo.today === today) return;

    const isFirstCheck = !memo.today;

    memo.today = today;

    if (isFirstCheck) return;

    setState({
      bookings: getState().bookings.map((booking) =>
        booking.startsAt
          ? { ...booking, dayOffset: toDayOffset(booking.startsAt) }
          : booking,
      ),
    });
  };

  /** The next page of a real account's Past, added under what's shown. */
  const loadOlderPast = async () => {
    const { pastCursor, isPastLoading } = getState();
    const { stylistId } = sync;

    if (!pastCursor || isPastLoading) return;

    setState({ isPastLoading: true });

    try {
      const { rows, cursor } = await fetchPastBookings(stylistId, pastCursor);

      setState((current) => ({
        ...mergeBookingRows(current, rows),
        pastCursor: cursor,
        isPastLoading: false,
      }));
    } catch {
      setState({ isPastLoading: false });
      showToast("Older appointments didn’t load. Try again.");
    }
  };

  return {
    setStatus,
    patchPast,
    rebookFrom,
    followToday,
    loadOlderPast,
  };
};
