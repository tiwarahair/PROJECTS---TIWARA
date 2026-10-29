import type { HomePeriod, HomeStats } from "../../../lib/studio-api/home";
import { SHORT_MONTHS, SHORT_WEEKDAYS } from "../../../utils/dates";
import { formatMoney, toPounds } from "../../../utils/money";
import type { StudioState } from "../core/types";

export const RANGE_LENGTHS: Record<StudioState["range"], number> = {
  today: 1,
  week: 7,
  month: 30,
};

const CAPTIONS: Record<StudioState["range"], string> = {
  today: "Today, by hour",
  week: "Last 7 days",
  month: "Last 30 days",
};

const DAY_MS = 86400000;

export interface StatDelta {
  text: string;
  isDown: boolean;
}

export interface HomeRange {
  caption: string;
  stats: Record<
    "bookings" | "revenue" | "occupancy" | "clients",
    [string, StatDelta | null]
  >;
  chart: number[];
  labels: string[];
  tips: string[];
}

const getOccupancy = ({
  booked_minutes: booked,
  open_minutes: open,
}: HomePeriod) =>
  open ? Math.min(100, Math.round((booked / open) * 100)) : null;

const toDelta = (difference: number, suffix = ""): StatDelta | null =>
  difference
    ? {
        text: `${difference > 0 ? "+" : "−"}${Math.abs(difference)}${suffix}`,
        isDown: difference < 0,
      }
    : null;

// nothing to compare with when the last period was empty
const getPercentDelta = (current: number, previous: number) =>
  previous > 0
    ? toDelta(Math.round(((current - previous) / previous) * 100), "%")
    : null;

const toDayKey = (time: number) => new Date(time).toISOString().slice(0, 10);

const getDays = (today: string, count: number) => {
  const end = Date.parse(`${today}T00:00:00Z`);

  return [...Array(count).keys()].map((index) =>
    toDayKey(end - (count - 1 - index) * DAY_MS),
  );
};

const getDayLabel = (day: string) => {
  const [, month = 1, date = 1] = day.split("-").map(Number);

  return `${date} ${SHORT_MONTHS[month - 1]}`;
};

// the day's usual hours, stretched to any hour that took money
const getHours = (today: string, buckets: HomeStats["buckets"]) => {
  const taken = Object.keys(buckets)
    .filter((key) => key.startsWith(today))
    .map((key) => Number(key.slice(11)));

  const first = Math.min(8, ...taken);
  const last = Math.max(20, ...taken);

  return [...Array(last - first + 1).keys()].map((index) => first + index);
};

const getChart = (
  range: StudioState["range"],
  today: string,
  buckets: HomeStats["buckets"],
) => {
  const getBucketPounds = (key: string) => toPounds(buckets[key] ?? 0);

  if (range === "today") {
    const hours = getHours(today, buckets);
    const toHour = (hour: number) => String(hour).padStart(2, "0");

    return {
      chart: hours.map((hour) => getBucketPounds(`${today}T${toHour(hour)}`)),
      labels: hours.map((hour, index) => (index % 2 ? "" : toHour(hour))),
      tips: hours.map((hour) => `${toHour(hour)}:00`),
    };
  }

  const days = getDays(today, RANGE_LENGTHS[range]);

  const getLabel = (day: string, index: number) => {
    if (range === "week")
      return SHORT_WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()] ?? "";

    return (days.length - 1 - index) % 7 === 0 ? getDayLabel(day) : "";
  };

  return {
    chart: days.map(getBucketPounds),
    labels: days.map(getLabel),
    tips: days.map((day) => (day === today ? "Today" : getDayLabel(day))),
  };
};

export const getLoadingRange = (range: StudioState["range"]): HomeRange => ({
  caption: CAPTIONS[range],
  stats: {
    bookings: ["", null],
    revenue: ["", null],
    occupancy: ["", null],
    clients: ["", null],
  },
  chart: [],
  labels: [],
  tips: [],
});

export const toHomeRange = (
  { today, current, previous, buckets }: HomeStats,
  range: StudioState["range"],
): HomeRange => {
  const occupancy = getOccupancy(current);
  const previousOccupancy = getOccupancy(previous);

  return {
    caption: CAPTIONS[range],
    stats: {
      bookings: [
        String(current.bookings),
        getPercentDelta(current.bookings, previous.bookings),
      ],
      revenue: [
        formatMoney(Math.round(current.revenue_pence / 100)),
        getPercentDelta(current.revenue_pence, previous.revenue_pence),
      ],
      occupancy: [
        occupancy === null ? "—" : `${occupancy}%`,
        occupancy !== null && previousOccupancy !== null
          ? toDelta(occupancy - previousOccupancy)
          : null,
      ],
      clients: [
        String(current.new_clients),
        previous.new_clients
          ? toDelta(current.new_clients - previous.new_clients)
          : null,
      ],
    },
    ...getChart(range, today, buckets),
  };
};
