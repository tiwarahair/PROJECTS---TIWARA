import type { ChangeEvent } from "react";
import { SLOT_TIMES } from "../../core/constants";
import { dayInfo } from "../../core/format";
import {
  getBookingBuffer,
  getConflicts,
  getSlots,
  getWorkingHours,
} from "../../core/model";
import { getTimeHints } from "../time-hints";
import type { SheetContext } from "./context";

// ---- reschedule ----
export const getRescheduleView = ({
  state,
  setState,
  actions,
  memo,
  booking,
}: SheetContext) => {
  const { rescheduleDay, rescheduleTime } = state;

  const slots = getSlots(
    state,
    rescheduleDay,
    booking.durationMinutes,
    getBookingBuffer(state, booking.service),
    booking.id,
  );

  const conflicts = getConflicts(
    state,
    rescheduleDay,
    rescheduleTime,
    booking.durationMinutes,
    booking.id,
  );

  const customTime = rescheduleTime || "";
  const isCustom = !!state.rescheduleCustom;

  const canMove = rescheduleDay != null && !!rescheduleTime;

  const reschedule = () => {
    if (!canMove) return;

    const previous = state.bookings;

    setState({
      bookings: state.bookings.map((item) =>
        item.id === state.sheetBookingId
          ? {
              ...item,
              dayOffset: rescheduleDay ?? 0,
              time: rescheduleTime ?? item.time,
              pending: false,
            }
          : item,
      ),
      dayIndex: rescheduleDay ?? 0,
      bookingsLayout: "cal",
    });

    const { label: dayLabel } = dayInfo(rescheduleDay ?? 0);

    actions.showToast(
      `Moved to ${dayLabel}, ${rescheduleTime}. ${booking.firstName} notified`,
      () => setState({ bookings: previous }),
    );

    actions.closeSheet();
  };

  memo.applyReschedule = reschedule;

  const conflictList = conflicts
    .map(({ name, range }) => `${name} (${range})`)
    .join(", ");

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
