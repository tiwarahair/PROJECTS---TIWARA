import { dateLabel } from "../../core/format";
import { getPolicyFee } from "../../core/model";
import type { PastRecord, StudioBooking } from "../../core/types";
import type { StudioController } from "../../core/use-studio";
import { resendConfirmLink } from "../../../../lib/studio-api/booking-writes";
import {
  getAddonLines,
  getFreshLink,
  getPaymentMode,
  getSheetBooking,
} from "./booking";

interface RemoteFinish {
  save: (remoteId: string) => Promise<unknown>;
  undo?: (remoteId: string) => Promise<unknown>;
}

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

  /** shows a change straight away; a real booking then saves it, and a failed save puts the screen back. */
  const saveBooking = (
    patch: Partial<StudioBooking>,
    task?: (remoteId: string) => Promise<unknown>,
  ) => {
    const previous = context.getState().bookings;

    patchBooking(patch);

    if (raw?.remoteId && task)
      context.sync?.save(() => task(raw.remoteId as string), {
        bookings: previous,
      });
  };

  const finish = (
    record: Partial<PastRecord>,
    message: string,
    remote?: RemoteFinish,
  ) => {
    const current = context.getState();
    const previousBookings = current.bookings;
    const previousPast = current.pastNew;
    const original = previousBookings.find(({ id }) => id === booking.id);
    const remoteId = remote && original?.remoteId;
    const undoRemote = remote?.undo;

    const next = {
      bookings: previousBookings.filter(({ id }) => id !== booking.id),
      pastNew: [
        {
          pastId: remoteId || Date.now(),
          ...(remoteId ? { remoteId } : {}),
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
    };

    const restore = { bookings: previousBookings, pastNew: previousPast };

    setState(next);

    if (remoteId) context.sync?.save(() => remote.save(remoteId), restore);

    if (remoteId && !undoRemote) return showToast(message);

    showToast(message, () => {
      setState(restore);
      closeSheet();

      if (remoteId && undoRemote)
        context.sync?.save(() => undoRemote(remoteId), next);
    });
  };

  const resendLink = (patch: { statusMenuOpen?: boolean } = {}) => {
    const count = (booking.resends || 0) + 1;

    setState(patch);

    // a real link keeps the deadline set when the booking was made
    saveBooking(
      raw?.remoteId
        ? { resends: count, linkSentAt: Date.now() }
        : { resends: count, ...getFreshLink(booking) },
      resendConfirmLink,
    );

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
    // a real booking keeps the deadline agreed when it was made
    isLate: booking.freeCancelUntil
      ? Date.now() >= Date.parse(booking.freeCancelUntil)
      : hoursToStart < (booking.agreedPolicy ?? state.policy).window,
    lateFee: getPolicyFee(state, "late", booking),
    noShowFee: getPolicyFee(state, "noShow", booking),
    paymentMode: getPaymentMode(booking),
    addonLines,
    servicePrice: Math.max(0, booking.price - addonSum),
    patchBooking,
    saveBooking,
    finish,
    resendLink,
  };
};

export type SheetContext = NonNullable<ReturnType<typeof getContext>>;
