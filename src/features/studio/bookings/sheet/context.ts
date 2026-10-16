import { dateLabel } from "../../core/format";
import { getPolicyFee } from "../../core/model";
import type { PastRecord, StudioBooking } from "../../core/types";
import type { StudioController } from "../../core/use-studio";
import {
  getAddonLines,
  getFreshLink,
  getPaymentMode,
  getSheetBooking,
} from "./booking";

export const getContext = (studio: StudioController) => {
  const { state, setState, actions, context } = studio;
  const { showToast, closeSheet } = actions;

  if (state.sheet !== "booking") return null;

  const raw =
    state.bookings.find(({ id }) => id === state.sheetBookingId) ||
    state.bookings[0];

  const booking = getSheetBooking(studio, raw);

  if (!booking) return null;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const hoursToStart =
    (booking.dayOffset * 1440 + booking.startMinutes - nowMinutes) / 60;

  const addonLines = getAddonLines(
    state.bookings.find(({ id }) => id === booking.id),
  );

  let addonSum = 0;

  for (const { amount } of addonLines) addonSum += amount;

  const patchBooking = (patch: Partial<StudioBooking>) =>
    setState(({ bookings }) => ({
      bookings: bookings.map((item) =>
        item.id === booking.id ? { ...item, ...patch } : item,
      ),
    }));

  /** Moves the booking to Past with an undo. */
  const finish = (record: Partial<PastRecord>, message: string) => {
    const current = context.getState();
    const previousBookings = current.bookings;
    const previousPast = current.pastNew;
    const original = previousBookings.find(({ id }) => id === booking.id);

    setState({
      bookings: previousBookings.filter(({ id }) => id !== booking.id),
      pastNew: [
        {
          pastId: Date.now(),
          client: booking.client,
          service: booking.service,
          price: booking.price,
          duration: booking.durationLabel,
          when: dateLabel(booking.dayOffset || 0),
          time: booking.time,
          at: Date.now(),
          original,
          ...record,
        } as PastRecord,
      ].concat(previousPast),
    });

    showToast(message, () => {
      setState({ bookings: previousBookings, pastNew: previousPast });
      closeSheet();
    });
  };

  const resendLink = (patch: { statusMenuOpen?: boolean } = {}) => {
    const count = (booking.resends || 0) + 1;

    setState({
      ...patch,
      bookings: state.bookings.map((item) =>
        item.id === booking.id
          ? { ...item, resends: count, ...getFreshLink(booking) }
          : item,
      ),
    });

    showToast(`Link resent to ${booking.firstName} · ${2 - count} of 2 left`);
  };

  return {
    studio,
    state,
    setState,
    actions,
    memo: context.memo,
    raw,
    booking,
    nowMinutes,
    hoursToStart,
    isLate: hoursToStart < state.policy.window,
    lateFee: getPolicyFee(state, "late", booking),
    noShowFee: getPolicyFee(state, "noShow", booking),
    paymentMode: getPaymentMode(booking),
    addonLines,
    servicePrice: Math.max(0, booking.price - addonSum),
    patchBooking,
    finish,
    resendLink,
  };
};

export type SheetContext = NonNullable<ReturnType<typeof getContext>>;
