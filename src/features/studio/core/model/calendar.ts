import { BLOCK_COLORS } from "../constants";
import {
  dateAt,
  durationToMinutes,
  hhmm,
  timeRange,
  timeToMinutes,
} from "../format";
import type { BlockedTime, StudioBooking, StudioState } from "../types";
import { getClient } from "./clients";
import { getBookingBuffer, getBookingDuration } from "./services";
import { getMinutesOfDay } from "../../../../utils/dates";

export const getBlockColour = () =>
  BLOCK_COLORS[0] ?? { id: "ink", label: "Blocked", hex: "#1a1714" };

export const getBlockTitle = (block: BlockedTime | undefined) =>
  (block?.reason || "Blocked time").replace(/( · )?Repeats.*$/, "");

export const getWorkingHours = (state: StudioState, offset: number) => {
  const date = new Date();

  date.setDate(date.getDate() + (offset || 0));

  return (
    state.hours[(date.getDay() + 6) % 7] ?? {
      day: "",
      on: true,
      start: "09:00",
      end: "18:00",
    }
  );
};

export const isBlockOn = (block: BlockedTime, offset: number): boolean => {
  const start = block.dayIndex == null ? 0 : block.dayIndex;

  if (offset === start) return true;

  const frequency = block.frequency || "none";

  if (frequency === "none" || offset < start) return false;

  if (
    (block.ends || "never") === "date" &&
    block.endDayOffset != null &&
    offset > block.endDayOffset
  )
    return false;

  if (frequency === "daily") return true;

  if (frequency === "weekly") return (offset - start) % 7 === 0;

  if (frequency === "monthly") {
    const first = dateAt(start);
    const current = dateAt(offset);

    if (current.getDate() === first.getDate()) return true;

    const last = new Date(
      current.getFullYear(),
      current.getMonth() + 1,
      0,
    ).getDate();

    return first.getDate() > last && current.getDate() === last;
  }

  return false;
};

export const getBlockRange = (
  state: StudioState,
  block: BlockedTime,
  offset: number,
): [number, number] => {
  if (block.span === "All day") {
    const hours = getWorkingHours(state, offset);

    return hours.on
      ? [timeToMinutes(hours.start), timeToMinutes(hours.end)]
      : [0, 1440];
  }

  const parts = block.span.split(" to ");

  return [timeToMinutes(parts[0]), timeToMinutes(parts[1] || parts[0])];
};

interface BusyRange {
  startMinutes: number;
  endMinutes: number;
  kind: "booking" | "block";
  booking?: StudioBooking;
  block?: BlockedTime;
}

export const getBusy = (
  state: StudioState,
  offset: number,
  excludeId?: number | null,
): BusyRange[] => {
  const bookings = state.bookings
    .filter(
      (booking) => booking.dayOffset === offset && booking.id !== excludeId,
    )
    .map((booking): BusyRange => {
      const start = timeToMinutes(booking.time);

      return {
        startMinutes: start,
        endMinutes:
          start +
          durationToMinutes(getBookingDuration(state, booking)) +
          getBookingBuffer(state, booking.service),
        kind: "booking",
        booking,
      };
    });

  const blocks = state.blocked
    .filter((block) => isBlockOn(block, offset))
    .map((block): BusyRange => {
      const [start, end] = getBlockRange(state, block, offset);

      return { startMinutes: start, endMinutes: end, kind: "block", block };
    });

  return bookings.concat(blocks);
};

const overlaps = (
  { startMinutes, endMinutes }: BusyRange,
  start: number,
  end: number,
) => startMinutes < end && endMinutes > start;

export const getSlots = (
  state: StudioState,
  offset: number | null,
  duration: number,
  buffer: number,
  excludeId: number | null,
): string[] => {
  if (offset == null) return [];

  const hours = getWorkingHours(state, offset);

  if (!hours.on) return [];

  const open = timeToMinutes(hours.start);
  const close = timeToMinutes(hours.end);
  const busy = getBusy(state, offset, excludeId);
  const nowMinutes = getMinutesOfDay();
  const length = duration + (buffer || 0);
  const slots: string[] = [];

  for (let start = open; start + length <= close; start += 30) {
    if (offset === 0 && start < nowMinutes) continue;

    if (busy.some((range) => overlaps(range, start, start + length))) continue;

    slots.push(hhmm(start));
  }

  return slots;
};

export const getConflicts = (
  state: StudioState,
  offset: number | null,
  time: string | null,
  duration: number,
  excludeId: number | null,
) => {
  if (offset == null || !time) return [];

  const start = timeToMinutes(time);
  const end = start + (duration || 0);

  return getBusy(state, offset, excludeId)
    .filter((range) => overlaps(range, start, end))
    .map(({ kind, booking, block }) =>
      kind === "booking" && booking
        ? {
            kind,
            name: getClient(state, booking.client).name,
            range: timeRange(booking.time, getBookingDuration(state, booking)),
          }
        : {
            kind,
            name: getBlockTitle(block),
            range:
              block?.span === "All day"
                ? "all day"
                : (block?.span ?? "").replace(" to ", "–"),
          },
    );
};

export const isOngoing = (
  booking: StudioBooking | null | undefined,
): boolean => {
  if (
    !booking ||
    booking.dayOffset !== 0 ||
    (booking.status || "confirmed") !== "arrived"
  )
    return false;

  const start = timeToMinutes(booking.time);
  const nowMinutes = getMinutesOfDay();

  return (
    nowMinutes >= start &&
    nowMinutes < start + durationToMinutes(booking.duration)
  );
};
