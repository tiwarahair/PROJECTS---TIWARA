import type { TouchEvent } from "react";
import { dayInfo, getMiniCalendarDays } from "../core/format";
import type { StudioState } from "../core/types";
import { LONG_MONTHS } from "../../../utils/dates";
import type { BookingsContext } from "./context";
import { DAY_NAMES } from "./types";

const getDotColour = (hasBooking: boolean, isSelected: boolean) => {
  if (!hasBooking) return "transparent";

  return isSelected ? "var(--brand-yellow)" : "var(--accent-700)";
};

const isPrevMonthOff = (
  { bookingCalendarMonth, bookingCalendarYear }: StudioState,
  now: Date,
) =>
  bookingCalendarYear == null ||
  bookingCalendarYear < now.getFullYear() ||
  (bookingCalendarYear === now.getFullYear() &&
    (bookingCalendarMonth ?? 0) <= now.getMonth());

// ---- the date picker ----
export const getDateNav = (
  { studio, state, now, calendarBookings }: BookingsContext,
  weekMonday: number,
) => {
  const { actions, context } = studio;
  const day = dayInfo(state.dayIndex);

  const dayPrefix = DAY_NAMES[state.dayIndex]
    ? `${DAY_NAMES[state.dayIndex]}, `
    : "";

  const pickerMonth = state.bookingCalendarMonth ?? now.getMonth();
  const pickerYear = state.bookingCalendarYear ?? now.getFullYear();

  const hasBookings = new Set(
    calendarBookings.map(({ dayOffset }) => dayOffset),
  );

  return {
    calendarDateLabel: `${dayPrefix}${day.weekday} ${day.dayNumber} ${day.monthName}`,
    weekStrip: Array.from({ length: 7 }, (_slot, index) => {
      const offset = weekMonday + index;
      const { weekday, dayNumber } = dayInfo(offset);
      const isSelected = offset === state.dayIndex;

      return {
        key: offset,
        weekday,
        dayNumber,
        isSelected,
        isToday: offset === 0,
        isPast: offset < 0,
        dot: getDotColour(hasBookings.has(offset), isSelected),
        pick: () => actions.setDay({ dayIndex: offset }),
      };
    }),
    // date picker
    pickerTitle: `${LONG_MONTHS[pickerMonth]} ${pickerYear}`,
    pickerDays: getMiniCalendarDays(
      pickerMonth,
      pickerYear,
      state.dayIndex,
      (offset) => actions.setDay({ dayIndex: offset, datePickerOpen: false }),
      -3650,
      (offset, isSelected) => getDotColour(hasBookings.has(offset), isSelected),
    ),
    isPrevOff: isPrevMonthOff(state, now),
    swipeStart: (event: TouchEvent) => {
      const touch = event.touches?.[0];

      if (touch) context.memo.swipe = { x: touch.clientX, y: touch.clientY };
    },
    swipeEnd: (event: TouchEvent) => {
      const start = context.memo.swipe;

      context.memo.swipe = null;
      const touch = event.changedTouches?.[0];

      if (!start || !touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;

      if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY) * 1.3)
        return;

      actions.slideDay(deltaX < 0 ? 1 : -1);
    },
  };
};
