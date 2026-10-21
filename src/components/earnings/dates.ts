import { formatWeekdayDate } from "../../utils/dates";
import { DAY_MS } from "./data";
import type { Bucket, DateRange, PeriodId } from "./data";

/** "14 Oct 2026" */
const formatDayYear = (date: Date): string =>
  date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const getDayStart = (date: Date): Date => {
  const start = new Date(date);

  start.setHours(0, 0, 0, 0);

  return start;
};

/** The period's [start, end); week starts on Monday. */
export const getRange = (
  period: PeriodId,
  from?: string,
  to?: string,
): DateRange => {
  const today = getDayStart(new Date());
  const year = today.getFullYear();
  const month = today.getMonth();

  if (period === "month")
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 1),
    };

  if (period === "lastmonth")
    return {
      start: new Date(year, month - 1, 1),
      end: new Date(year, month, 1),
    };

  if (period === "custom" && from && to) {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);

    end.setDate(end.getDate() + 1);

    return { start, end };
  }

  const start = new Date(today);

  start.setDate(start.getDate() - ((today.getDay() + 6) % 7));
  const end = new Date(start);

  end.setDate(end.getDate() + 7);

  return { start, end };
};

/** "5 Oct – 11 Oct 2026" */
export const getRangeLabel = ({ start, end }: DateRange): string => {
  const last = new Date(end.getTime() - DAY_MS);
  const isSameYear = start.getFullYear() === last.getFullYear();

  const startLabel = start.toLocaleDateString(
    "en-GB",
    isSameYear
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" },
  );

  return `${startLabel} – ${formatDayYear(last)}`;
};

const getDayBuckets = (rangeStart: Date, days: number): Bucket[] => {
  const buckets: Bucket[] = [];

  for (let index = 0; index < days; index++) {
    const start = new Date(rangeStart.getTime() + index * DAY_MS);

    start.setHours(0, 0, 0, 0);
    const end = new Date(start);

    end.setDate(end.getDate() + 1);

    buckets.push({
      start,
      end,
      label:
        days <= 7
          ? start.toLocaleDateString("en-GB", { weekday: "short" })
          : String(start.getDate()),
      long: formatWeekdayDate(start),
    });
  }

  return buckets;
};

const getWeekBuckets = ({ start: rangeStart, end: rangeEnd }: DateRange) => {
  const buckets: Bucket[] = [];
  let start = new Date(rangeStart);

  while (start < rangeEnd) {
    const end = new Date(start);

    end.setDate(end.getDate() + 7);
    const clipped = end > rangeEnd ? rangeEnd : end;
    const last = new Date(clipped.getTime() - DAY_MS);
    const startMonth = start.toLocaleDateString("en-GB", { month: "short" });

    const lastDay = last.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });

    buckets.push({
      start: new Date(start),
      end: clipped,
      label: `${start.getDate()} ${startMonth}`,
      long: `${start.getDate()} – ${lastDay}`,
    });

    start = clipped;
  }

  return buckets;
};

const getMonthBuckets = ({ start: rangeStart, end: rangeEnd }: DateRange) => {
  const buckets: Bucket[] = [];
  let start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);

  while (start < rangeEnd) {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

    buckets.push({
      start: new Date(Math.max(start.getTime(), rangeStart.getTime())),
      end: end > rangeEnd ? rangeEnd : end,
      label: start.toLocaleDateString("en-GB", { month: "short" }),
      long: start.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    });

    start = end;
  }

  return buckets;
};

/** Chart buckets: days up to two weeks, weeks up to ~3 months, else months. */
export const getBuckets = (
  range: DateRange,
): { title: string; buckets: Bucket[] } => {
  const days = Math.round(
    (range.end.getTime() - range.start.getTime()) / DAY_MS,
  );

  if (days <= 14)
    return {
      title: "Takings by day",
      buckets: getDayBuckets(range.start, days),
    };

  if (days <= 100)
    return { title: "Weekly takings", buckets: getWeekBuckets(range) };

  return { title: "Monthly takings", buckets: getMonthBuckets(range) };
};
