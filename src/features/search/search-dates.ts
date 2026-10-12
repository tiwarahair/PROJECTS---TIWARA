// Date & time picker model: calendar cells, quick days, time pills and labels.
import type { SearchState } from "./search-state";

export const TIMES = [
  { id: "any", label: "Any time", meta: "" },
  { id: "morning", label: "Morning", meta: "9am - 12pm" },
  { id: "afternoon", label: "Afternoon", meta: "12pm - 6pm" },
  { id: "evening", label: "Evening", meta: "6pm - 12am" },
];
export const HOURS = [
  "8am",
  "9am",
  "10am",
  "11am",
  "12pm",
  "1pm",
  "2pm",
  "3pm",
  "4pm",
  "5pm",
  "6pm",
  "7pm",
  "8pm",
];
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Local YYYY-MM-DD. */
export const toIsoDate = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
};

export const getVisibleMonth = ({ calendarMonth }: SearchState): Date =>
  calendarMonth || new Date(new Date().getFullYear(), new Date().getMonth(), 1);

export interface CalendarCell {
  key: string;
  label: string;
  isDay: boolean;
  value: string;
  isPast: boolean;
}

/** Monday-first month grid padded to whole weeks. */
export const getCalendarCells = (month: Date): CalendarCell[] => {
  const todayIso = toIsoDate(new Date());
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;

  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();

  return Array.from(
    { length: Math.ceil((lead + daysInMonth) / 7) * 7 },
    (_cell, index) => {
      const day = index - lead + 1;

      if (day < 1 || day > daysInMonth)
        return {
          key: `c${index}`,
          label: "",
          isDay: false,
          value: "",
          isPast: false,
        };

      const value = toIsoDate(
        new Date(month.getFullYear(), month.getMonth(), day),
      );

      return {
        key: `c${index}`,
        label: String(day),
        isDay: true,
        value,
        isPast: value < todayIso,
      };
    },
  );
};

export const getQuickDays = () =>
  [0, 1].map((offset) => {
    const date = new Date();

    date.setDate(date.getDate() + offset);

    return {
      key: `q${offset}`,
      label: offset === 0 ? "Today" : "Tomorrow",
      meta: date.toLocaleDateString("en-GB", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      value: toIsoDate(date),
    };
  });

export const getTimeLabel = ({
  time,
  customFrom,
  customTo,
}: SearchState): string =>
  time === "custom"
    ? `${customFrom} - ${customTo}`
    : (TIMES.find(({ id }) => id === time) || TIMES[0])?.label || "Any time";

/** Desktop When field: "Sat 12 Oct · Morning" or "Any date". */
export const getDateLabel = (state: SearchState): string =>
  (state.query.date
    ? new Date(`${state.query.date}T00:00:00`).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "Any date") + (state.time !== "any" ? ` · ${getTimeLabel(state)}` : "");

/** Mobile summary date label. */
export const getMobileDateLabel = ({ query }: SearchState): string =>
  query.date
    ? new Date(`${query.date}T00:00:00`).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "Any time";
