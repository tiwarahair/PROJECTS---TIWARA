import type { ChangeEvent } from "react";
import { rescheduleStudioBooking } from "../../../../lib/studio-api";
import { SLOT_TIMES } from "../../core/constants";
import { dayInfo, timeToMinutes } from "../../core/format";
import {
  getBookingBuffer,
  getConflicts,
  getNowMinutes,
  getSlots,
  getWorkingHours,
} from "../../core/model";
import { toStartsAt } from "../records";
import { getTimeHints } from "../time-hints";
import type { StudioBooking } from "../../core/types";
import type { SheetContext } from "./context";

/** The free-cancellation deadline moves with the booking, as it does when saved. */
const getMovedDeadline = (
  { startsAt, freeCancelUntil }: StudioBooking,
  newStartsAt: string,
) => {
  if (!startsAt || !freeCancelUntil) return freeCancelUntil;

  const windowMs = Date.parse(startsAt) - Date.parse(freeCancelUntil);

  return new Date(Date.parse(newStartsAt) - windowMs).toISOString();
};

// ---- reschedule ----
export const getRescheduleView = ({
  studio,
  state,
  setState,
  actions,
  booking,
}: SheetContext) => {
  const { rescheduleDay, rescheduleTime } = state;
  const buffer = getBookingBuffer(state, booking.service);

  const slots = getSlots(
    state,
    rescheduleDay,
    booking.durationMinutes,
    buffer,
    booking.id,
  );

  // the buffer counts, as it does when the booking is saved
  const conflicts = getConflicts(
    state,
    rescheduleDay,
    rescheduleTime,
    booking.durationMinutes + buffer,
    booking.id,
  );

  const customTime = rescheduleTime || "";
  const isCustom = !!state.rescheduleCustom;

  const isPastTime =
    rescheduleDay === 0 &&
    !!rescheduleTime &&
    timeToMinutes(rescheduleTime) <= getNowMinutes();

  const canMove = rescheduleDay != null && !!rescheduleTime && !isPastTime;
  const isDoubleBooking = conflicts.some(({ kind }) => kind === "booking");

  const conflictList = conflicts
    .map(({ name, range }) => `${name} (${range})`)
    .join(", ");

  const move = () => {
    const previous = state.bookings;
    const day = rescheduleDay ?? 0;
    const time = rescheduleTime ?? booking.time;
    const startsAt = toStartsAt(day, time);
    const { remoteId, startsAt: oldStartsAt } = booking;
    const { sync } = studio.context;

    const next = state.bookings.map((item) =>
      item.id === state.sheetBookingId
        ? {
            ...item,
            dayOffset: day,
            time,
            startsAt: remoteId ? startsAt : item.startsAt,
            freeCancelUntil: getMovedDeadline(item, startsAt),
            status: item.status === "arrived" ? "confirmed" : item.status,
            pending: false,
          }
        : item,
    );

    const save = (at: string, revert: typeof next, allowOverlap: boolean) => {
      if (remoteId)
        sync?.save(() => rescheduleStudioBooking(remoteId, at, allowOverlap), {
          bookings: revert,
        });
    };

    setState({
      confirm: null,
      bookings: next,
      dayIndex: day,
      bookingsLayout: "cal",
    });

    save(startsAt, previous, isDoubleBooking);

    const { label: dayLabel } = dayInfo(day);

    actions.showToast(
      `Moved to ${dayLabel}, ${time}. ${booking.firstName} notified`,
      () => {
        setState({ bookings: previous });

        if (oldStartsAt) save(oldStartsAt, next, !!booking.overlapOk);
      },
    );

    actions.closeSheet();
  };

  const reschedule = () => {
    if (!canMove) return;

    if (!isDoubleBooking) return move();

    const { label: dayLabel } = dayInfo(rescheduleDay ?? 0);

    setState({
      confirm: {
        title: "This time clashes with another booking",
        emphasis: `Overlaps ${conflictList}`,
        body: `Are you sure you want to move ${booking.firstName} to ${dayLabel}, ${rescheduleTime}? Both bookings will stay in your calendar.`,
        yesLabel: "Move anyway",
        noLabel: "Go back",
        yes: move,
      },
    });
  };

  return {
    rescheduleDays: Array.from({ length: 8 }, (_slot, offset) => {
      const { weekday, dayNumber } = dayInfo(offset);

      return {
        key: offset,
        weekday,
        dayNumber,
        isOn: rescheduleDay === offset,
        pick: () => setState({ rescheduleDay: offset }),
      };
    }),
    rescheduleTimes: slots.map((time) => ({
      key: time,
      label: time,
      isOn: rescheduleTime === time,
      pick: () => setState({ rescheduleTime: time, rescheduleCustom: false }),
    })),
    hasNoSlots: rescheduleDay != null && slots.length === 0,
    ...getTimeHints(
      getWorkingHours(state, rescheduleDay || 0),
      isCustom,
      customTime,
    ),
    ...(isPastTime
      ? {
          customHint: "That time has passed. Pick a later one.",
          isCustomWarn: true,
        }
      : {}),
    isCustom,
    toggleCustom: () =>
      setState({
        rescheduleCustom: !isCustom,
        rescheduleTime:
          isCustom || SLOT_TIMES.includes(rescheduleTime ?? "")
            ? null
            : rescheduleTime,
      }),
    customTime,
    onCustomTime: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ rescheduleTime: event.target.value || null }),
    rescheduleWarning: conflicts.length
      ? `Overlaps ${conflictList}. You can still move it.`
      : "",
    canMove,
    reschedule,
  };
};
