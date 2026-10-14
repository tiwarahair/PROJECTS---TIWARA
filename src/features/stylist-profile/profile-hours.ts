// Opening hours on the profile: open now / next opening, and the hours table.
import type { WorkingHours } from "../../lib/public-profiles";
import {
  formatClockTime,
  formatWeekdayDate,
  LONG_WEEKDAYS,
  MONDAY_FIRST_WEEKDAYS,
} from "../../utils/dates";

const LONG_MONDAY_FIRST = [...LONG_WEEKDAYS.slice(1), LONG_WEEKDAYS[0]];

/** "09:00:00" → "9:00" */
const toClock = (time: string) => time.slice(0, 5).replace(/^0/, "");

const toMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

// weekday 0 is Monday; Date.getDay() 0 is Sunday
const getDayHours = (hours: WorkingHours[], date: Date) =>
  hours.find(
    ({ weekday, is_open }) => is_open && weekday === (date.getDay() + 6) % 7,
  );

const getDayLabel = (date: Date, now: Date) => {
  const startOf = (day: Date) => new Date(day).setHours(0, 0, 0, 0);
  const days = Math.round((startOf(date) - startOf(now)) / 864e5);

  if (days === 0) return "today";

  if (days === 1) return "tomorrow";

  return formatWeekdayDate(date);
};

/** "opens Tuesday 10:00", from the next open day in the coming week. */
const getNextOpening = (hours: WorkingHours[], now: Date) => {
  for (let offset = 1; offset <= 7; offset++) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
    );

    const day = getDayHours(hours, date);

    if (day)
      return `opens ${LONG_WEEKDAYS[date.getDay()]} ${toClock(day.start_time)}`;
  }

  return "";
};

export interface OpenStatus {
  isOpen: boolean;
  nextAvailable: string;
  openLabel: string;
  openHours: string;
}

export const getOpenStatus = (
  hours: WorkingHours[],
  nextStart: Date | null,
  now = new Date(),
): OpenStatus => {
  const today = getDayHours(hours, now);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const opensLater = !!today && minutesNow < toMinutes(today.start_time);

  const isOpen =
    !!today && !opensLater && minutesNow < toMinutes(today.end_time);

  let openHours = getNextOpening(hours, now);

  if (today && isOpen) openHours = `until ${toClock(today.end_time)}`;

  if (today && opensLater) openHours = `opens ${toClock(today.start_time)}`;

  return {
    isOpen,
    nextAvailable: nextStart
      ? `${getDayLabel(nextStart, now)} ${formatClockTime(nextStart)}`
      : "by request",
    openLabel: isOpen ? "Open now" : "Closed",
    openHours,
  };
};

export interface HoursRow {
  day: string;
  time: string;
  shut: boolean;
}

/** One row per run of days with the same hours: "Mon – Fri 9:00 – 18:00", "Sunday Closed". */
export const getHoursRows = (hours: WorkingHours[]): HoursRow[] => {
  const runs: { first: number; last: number; time: string }[] = [];

  hours.forEach(({ weekday, is_open, start_time, end_time }) => {
    const time = is_open
      ? `${toClock(start_time)} – ${toClock(end_time)}`
      : "Closed";

    const previous = runs[runs.length - 1];

    if (previous?.time === time && previous.last === weekday - 1)
      previous.last = weekday;
    else runs.push({ first: weekday, last: weekday, time });
  });

  return runs.map(({ first, last, time }) => ({
    day:
      first === last
        ? (LONG_MONDAY_FIRST[first] ?? "")
        : `${MONDAY_FIRST_WEEKDAYS[first]} – ${MONDAY_FIRST_WEEKDAYS[last]}`,
    time,
    shut: time === "Closed",
  }));
};
