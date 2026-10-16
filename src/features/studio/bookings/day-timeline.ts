import type { MouseEvent } from "react";
import { durationToMinutes, hhmm, timeToMinutes } from "../core/format";
import {
  getBookingBuffer,
  getExtraByName,
  getTileTone,
  getWorkingHours,
} from "../core/model";
import type { StudioState } from "../core/types";
import type { BookingsContext } from "./context";
import type { DecoratedBooking } from "./decorate";
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
import { DAY_PX, END_HOUR, END_MINUTES } from "./types";

const getDayTop = getTimeToPixels(DAY_PX);

const getTravelNote = (extra: number, travel: number) => {
  if (extra && travel) return ` (${travel}m travel)`;

  if (travel) return " travel";

  return "";
};

const getStub = (state: StudioState, booking: DecoratedBooking) => {
  const buffer = getBookingBuffer(state, booking.service);

  if (!buffer) return null;

  const end = timeToMinutes(booking.time) + durationToMinutes(booking.duration);
  const extra = getExtraByName(state, booking.service);
  const tone = getTileTone(state, booking.service);

  return {
    key: booking.id,
    top: toPixels(getDayTop(end) - 1),
    height: toPixels(Math.max(15, (buffer / 60) * DAY_PX - 1)),
    background: tone.background,
    foreground: tone.meta,
    dash: tone.hatch,
    label: `+${buffer}m${getTravelNote(extra, buffer - extra)}`,
  };
};

const getQuarters = () => {
  const quarters: string[] = [];

  for (let minutes = 15; minutes < END_MINUTES; minutes += 15)
    if (minutes % 60) quarters.push(toPixels(getDayTop(minutes)));

  return quarters;
};

// ---- the day / week timeline ----
export const getDayTimeline = ({
  studio,
  state,
  setState,
  upcoming,
  nowMinutes,
}: BookingsContext) => {
  const { dayIndex } = state;
  const hours = getWorkingHours(state, dayIndex);

  const dayBookings = upcoming.filter(
    ({ dayOffset }) => dayOffset === dayIndex,
  );

  const quickTime = state.quickAdd?.time ?? null;

  const isQuickOutside =
    !!quickTime && isOutsideHours(hours, timeToMinutes(quickTime));

  const outsideHint = hours.on
    ? `Outside your hours (${hours.start}–${hours.end}). You can still book it.`
    : "You’re closed this day. You can still book it.";

  return {
    hourLines: Array.from({ length: END_HOUR + 1 }, (_slot, hour) => ({
      key: hour,
      label: getHourLabel(hour),
      paddedHour: String(hour).padStart(2, "0"),
      top: toPixels(getDayTop(hour * 60)),
      isWorking:
        hours.on &&
        hour * 60 >= timeToMinutes(hours.start) &&
        hour * 60 <= timeToMinutes(hours.end),
    })),
    quarters: getQuarters(),
    dayBlocks: dayBookings.map((booking) => ({
      booking,
      top: toPixels(getDayTop(timeToMinutes(booking.time))),
      height: toPixels(
        Math.max(40, (durationToMinutes(booking.duration) / 60) * DAY_PX - 3),
      ),
    })),
    stubs: dayBookings
      .map((booking) => getStub(state, booking))
      .filter((item) => item !== null),
    nowLine:
      dayIndex === 0 && nowMinutes > 0 && nowMinutes < END_MINUTES
        ? { top: toPixels(getDayTop(nowMinutes)), label: hhmm(nowMinutes) }
        : null,
    dayOffBands: getOffBands(state, dayIndex, getDayTop),
    dayBlocked: getBlocked(studio, dayIndex, getDayTop, 22),
    dayHeight: toPixels(END_HOUR * DAY_PX + 14),
    quickHint: isQuickOutside ? outsideHint : "What would you like to do here?",
    isQuickOutside,
    onTimelineTap: (event: MouseEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();

      const quarter = Math.floor(
        (event.clientY - rect.top) / (rect.height / 96),
      );

      const minutes = getTappedMinutes(quarter);

      if (!studio.isWide) {
        setState({ quickAdd: { time: hhmm(minutes) }, quickAddOut: false });

        return;
      }

      setState({
        pop: {
          time: hhmm(minutes),
          ...getPopPosition(event),
          warn: isOutsideHours(hours, minutes),
        },
      });
    },
  };
};
