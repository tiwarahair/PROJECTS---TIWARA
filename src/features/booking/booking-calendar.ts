// Step 3 (Pick a time): month grid and date labels.
import type { WorkingHours } from "../../lib/public-profiles";
import { formatWeekdayDate, LONG_WEEKDAYS } from "../../utils/dates";

export interface CalendarDay {
  key: string;
  label: string;
  day: number | null;
  off: boolean;
  selected: boolean;
}

/** Monday-first grid: blank cells, then each day; days without an open time are off. */
export const getCalendarDays = (
  year: number,
  month: number,
  openDays: Set<number>,
  selectedDay: number | null,
): CalendarDay[] => {
  const daysIn = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const days: CalendarDay[] = [];

  for (let index = 0; index < firstWeekday; index++)
    days.push({
      key: `blank-${index}`,
      label: "",
      day: null,
      off: true,
      selected: false,
    });

  for (let day = 1; day <= daysIn; day++)
    days.push({
      key: `day-${day}`,
      label: `${day}`,
      day,
      off: !openDays.has(day),
      selected: selectedDay === day,
    });

  return days;
};

/** " Closed Mondays and Sundays." for the stylist's closed weekdays, Monday first. */
export const getClosedLine = (hours: WorkingHours[]): string => {
  // weekday 0 is Monday; LONG_WEEKDAYS starts on Sunday
  const closed = hours
    .filter(({ is_open }) => !is_open)
    .map(({ weekday }) => `${LONG_WEEKDAYS[(weekday + 1) % 7] ?? ""}s`);

  if (!closed.length) return "";

  const closedDays =
    closed.length > 1
      ? `${closed.slice(0, -1).join(", ")} and ${closed[closed.length - 1]}`
      : closed[0];

  return ` Closed ${closedDays}.`;
};

/** "Wed 14 Oct" */
export const formatShortDate = (
  year: number,
  month: number,
  day: number,
): string => formatWeekdayDate(new Date(year, month, day));

/** "Wed 14 Oct · 10:30", or "Not chosen yet". */
export const getWhenLine = (
  year: number,
  month: number,
  day: number | null,
  time: string | null,
): string =>
  day
    ? formatShortDate(year, month, day) + (time ? ` · ${time}` : "")
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
