import type { MouseEvent } from "react";
import {
  dayInfo,
  durationToMinutes,
  hhmm,
  timeToMinutes,
} from "../core/format";
import { getWorkingHours } from "../core/model";
import type { BookingsContext } from "./context";
import {
  getBlocked,
  getHourLabel,
  getOffBands,
  getPopPosition,
  getTappedMinutes,
  getTimeToPixels,
  isOutsideHours,
  toPixels,
} from "./timeline";
import { END_HOUR, END_MINUTES, WEEK_PX } from "./types";

const getWeekTop = getTimeToPixels(WEEK_PX);

const getWeekColumns = (
  { studio, state, setState, calendarBookings, nowMinutes }: BookingsContext,
  weekMonday: number,
) =>
  Array.from({ length: 7 }, (_slot, index) => {
    const offset = weekMonday + index;
    const { weekday, dayNumber } = dayInfo(offset);
    const isToday = offset === 0;

    return {
      key: offset,
      weekday,
      dayNumber,
      isToday,
      isSelected: offset === state.dayIndex,
      offBands: getOffBands(state, offset, getWeekTop),
      blocked: getBlocked(studio, offset, getWeekTop, 18),
      blocks: calendarBookings
        .filter(({ dayOffset }) => dayOffset === offset)
        .map((booking) => ({
          booking,
          top: toPixels(getWeekTop(timeToMinutes(booking.time))),
          height: toPixels(
            Math.max(
              30,
              (durationToMinutes(booking.duration) / 60) * WEEK_PX - 3,
            ),
          ),
        })),
      nowTop:
        isToday && nowMinutes > 0 && nowMinutes < END_MINUTES
          ? toPixels(getWeekTop(nowMinutes))
          : null,
      pickDay: () => studio.actions.setCalendar({ dayIndex: offset }),
      tap: (event: MouseEvent<HTMLElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();

        const minutes = getTappedMinutes(
          Math.floor((event.clientY - rect.top) / (WEEK_PX / 4)),
        );

        setState({
          dayIndex: offset,
          pop: {
            time: hhmm(minutes),
            warn: isOutsideHours(getWorkingHours(state, offset), minutes),
            ...getPopPosition(event),
          },
        });
      },
    };
  });

// where the week view scrolls to: an hour before now, else just above the first booking
const getScrollTarget = (
  weekCols: ReturnType<typeof getWeekColumns>,
  weekMonday: number,
  nowMinutes: number,
) => {
  if (weekMonday <= 0 && weekMonday + 6 >= 0)
    return getWeekTop(Math.max(0, nowMinutes - 60));

  const firsts = weekCols.flatMap(({ blocks }) =>
    blocks.map(({ top }) => parseFloat(top)),
  );

  if (firsts.length) return Math.min(...firsts) - 24;

  return getWeekTop(8 * 60);
};

export const getWeekTimeline = (
  context: BookingsContext,
  weekMonday: number,
) => {
  const { studio, state, nowMinutes } = context;
  const isWeek = state.calendarMode === "week";
  const weekCols = isWeek ? getWeekColumns(context, weekMonday) : [];

  if (isWeek) {
    const { memo } = studio.context;

    memo.weekScrollTarget = Math.max(
      0,
      getScrollTarget(weekCols, weekMonday, nowMinutes),
    );

    memo.weekKey = weekMonday;
  }

  return {
    isWeek,
    weekCols,
    weekHours: Array.from({ length: END_HOUR + 1 }, (_slot, hour) => ({
      key: hour,
      label: getHourLabel(hour),
      top: toPixels(getWeekTop(hour * 60)),
    })),
    weekHeight: toPixels(END_HOUR * WEEK_PX + 14),
  };
};
