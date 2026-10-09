// Step 3 (Pick a time): month grid, slots and date labels (prototype Booking renderVals calDays / slots / whenLine).
import type { Stylist } from "../../types/stylist";
import { slotsFor } from "../../utils/availability";

export interface CalendarDay {
  key: string;
  label: string;
  day: number | null;
  off: boolean;
  selected: boolean;
}

/** Monday-first grid: blank cells, then each day; past days and days with no slot for this duration are off. */
export const getCalendarDays = (
  stylist: Stylist,
  year: number,
  month: number,
  mins: number,
  selectedDay: number | null,
): CalendarDay[] => {
  const daysIn = new Date(year, month + 1, 0).getDate();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: CalendarDay[] = [];
  for (let index = 0; index < firstDow; index++)
    days.push({
      key: "blank-" + index,
      label: "",
      day: null,
      off: true,
      selected: false,
    });
  for (let day = 1; day <= daysIn; day++) {
    const date = new Date(year, month, day);
    days.push({
      key: "day-" + day,
      label: "" + day,
      day,
      off: date < today || !slotsFor(stylist, date, mins).length,
      selected: selectedDay === day,
    });
  }
  return days;
};

export const getSlots = (
  stylist: Stylist,
  year: number,
  month: number,
  day: number | null,
  mins: number,
): string[] => (day ? slotsFor(stylist, new Date(year, month, day), mins) : []);

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const WEEKDAY_PLURALS = [
  "Sundays",
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
];

/** " Closed Mondays and Sundays." for weekdays with no availability, Monday first. */
export const getClosedLine = ({ availability }: Stylist): string => {
  const closed = [1, 2, 3, 4, 5, 6, 0]
    .filter((index) => {
      const key = WEEKDAY_KEYS[index];
      return !(key && (availability ?? {})[key]?.length);
    })
    .map((index) => WEEKDAY_PLURALS[index] ?? "");
  if (!closed.length) return "";
  return (
    " Closed " +
    (closed.length > 1
      ? closed.slice(0, -1).join(", ") + " and " + closed[closed.length - 1]
      : closed[0]) +
    "."
  );
};

/** "Wed 14 Oct" */
export const formatShortDate = (
  year: number,
  month: number,
  day: number,
): string =>
  new Date(year, month, day).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

/** "Wed 14 Oct · 10:30", or "Not chosen yet". */
export const getWhenLine = (
  year: number,
  month: number,
  day: number | null,
  time: string | null,
): string =>
  day
    ? formatShortDate(year, month, day) + (time ? " · " + time : "")
    : "Not chosen yet";

/** "Wednesday 14 October" */
export const formatLongDate = (
  year: number,
  month: number,
  day: number,
): string =>
  new Date(year, month, day).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

/** "October 2026" */
export const formatMonthTitle = (year: number, month: number): string =>
  new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

export const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
