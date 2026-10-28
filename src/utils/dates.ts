// Shared date names and small date/duration formatters.

export const LONG_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Sunday-first, to index with Date#getDay. */
export const SHORT_WEEKDAYS = LONG_WEEKDAYS.map((name) => name.slice(0, 3));

/** Monday-first, for calendar headers. */
export const MONDAY_FIRST_WEEKDAYS = [
  ...SHORT_WEEKDAYS.slice(1),
  ...SHORT_WEEKDAYS.slice(0, 1),
];

export const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const SHORT_MONTHS = LONG_MONTHS.map((name) => name.slice(0, 3));

/** As SHORT_MONTHS but with "Sept". */
export const SHORT_MONTHS_SEPT = LONG_MONTHS.map((name) =>
  name.slice(0, name === "September" ? 4 : 3),
);

const pad2 = (value: number): string => String(value).padStart(2, "0");

/** Local YYYY-MM-DD. */
export const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** "09:05" */
export const formatClockTime = (date: Date): string =>
  `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

/** "Wed 14 Oct 2026" */
export const formatFullDate = (date: Date): string =>
  date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** "Wed 14 Oct" */
export const formatWeekdayDate = (date: Date): string =>
  date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

/** 270 → "4h 30m", 240 → "4h", 45 → "45m". */
export const formatDuration = (totalMinutes: number): string => {
  const rounded = Math.round(totalMinutes);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;

  if (hours && minutes) return `${hours}h ${minutes}m`;

  return hours ? `${hours}h` : `${minutes}m`;
};

const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

export const getTimeAgo = (at: Date, now = new Date()) => {
  const elapsed = now.getTime() - at.getTime();
  const isToday = at.toDateString() === now.toDateString();

  if (elapsed < 60000) return "Just now";

  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / 60000)}m ago`;

  if (isToday) return `${Math.floor(elapsed / HOUR_MS)}h ago`;

  if (at.toDateString() === new Date(now.getTime() - DAY_MS).toDateString())
    return "Yesterday";

  if (elapsed < 6 * DAY_MS) return SHORT_WEEKDAYS[at.getDay()] ?? "";

  return `${at.getDate()} ${SHORT_MONTHS[at.getMonth()]}`;
};

const londonDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** A UK time from an ISO string, wherever the device is: "Fri 20 Nov, 10:00". */
export const formatLondonDateTime = (iso: string): string =>
  londonDateTime.format(new Date(iso));
