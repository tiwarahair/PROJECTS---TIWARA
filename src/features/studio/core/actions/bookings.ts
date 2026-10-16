import { durationToMinutes, timeToMinutes } from "../format";
import { getBookingDuration, getNowMinutes } from "../model";
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

export const createBookingActions = (
  { getState, setState }: StudioContext,
  { showToast, openSheet, closeSheet }: BookingDeps,
) => {
  const setStatus = (
    id: number,
    status: string,
    message: string,
    extra: Partial<StudioBooking> = {},
  ) => {
    const previous = getState().bookings;

    setState({
      bookings: previous.map((booking) =>
        booking.id === id ? { ...booking, status, ...extra } : booking,
      ),
    });

    showToast(message, () => setState({ bookings: previous }));
  };

  const patchPast = (
    pastId: string | number | undefined,
    patch: Partial<PastRecord> | ((row: PastRecord) => Partial<PastRecord>),
    seed: PastRecord[],
  ) => {
    const state = getState();

    const resolve = (row: PastRecord) =>
      typeof patch === "function" ? patch(row) : patch;

    if (state.pastNew.some((row) => row.pastId === pastId)) {
      setState({
        pastNew: state.pastNew.map((row) =>
          row.pastId === pastId ? { ...row, ...resolve(row) } : row,
        ),
      });

      return;
    }

    const current =
      seed.find((row) => row.pastId === pastId) ?? ({} as PastRecord);

    const overrides = state.pastOverrides ?? {};
    const key = String(pastId);
    const merged = { ...current, ...(overrides[key] ?? {}) };

    setState({
      pastOverrides: {
        ...overrides,
        [key]: { ...(overrides[key] ?? {}), ...resolve(merged) },
      },
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

  /** Bookings that ended an hour ago are marked done-but-unpaid. */
  const autoComplete = () => {
    const state = getState();
    const nowMinutes = getNowMinutes();

    const isOverAnHour = (booking: StudioBooking) =>
      booking.dayOffset < 0 ||
      (booking.dayOffset === 0 &&
        timeToMinutes(booking.time) +
          durationToMinutes(getBookingDuration(state, booking)) +
          60 <=
          nowMinutes);

    const done = state.bookings.filter(
      (booking) =>
        !booking.autoDone &&
        !booking.pending &&
        (booking.status === "arrived" || booking.status === "confirmed") &&
        isOverAnHour(booking),
    );

    if (!done.length) return;

    setState({
      bookings: state.bookings.map((booking) =>
        done.includes(booking)
          ? { ...booking, autoDone: true, checkoutUnpaid: true }
          : booking,
      ),
    });
  };

  return { setStatus, patchPast, rebookFrom, autoComplete };
};
