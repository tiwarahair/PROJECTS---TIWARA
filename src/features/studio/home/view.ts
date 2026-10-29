import type { PointerEvent } from "react";
import { GATE_REASON } from "../core/constants";
import {
  getCalendarBookings,
  getDecoratedBookings,
} from "../bookings/decorate";
import { copyText, makeChart } from "../core/format";
import { getBookingLink, getPastKey } from "../core/model";
import { isGated } from "../shell";
import type { StudioController } from "../core/use-studio";
import { getLoadingRange } from "./records";
import type { HomeRange } from "./records";

// desktop cards are stretched to the hero's height, so a quiet line under the number fills the room
const STAT_SUBTITLES: Record<string, string> = {
  Bookings: "vs last period",
  Revenue: "takings less refunds",
  Occupancy: "of working hours",
  "New clients": "first visits",
};

// how many days ahead each range looks; anything else falls back to 30
const RANGE_DAYS: Record<string, number> = { today: 1, week: 7 };

export const getHomeView = (
  studio: StudioController,
  real: HomeRange | null,
  isError = false,
) => {
  const { state, setState, isDesktop, hasBookings, actions } = studio;
  const isLoading = real === null;

  const upcoming = getDecoratedBookings(state, (booking) =>
    actions.openSheet("booking", { sheetBookingId: booking.id }),
  );

  const rangeData = real ?? getLoadingRange(state.range);

  const chart = makeChart(rangeData.chart);

  const due = upcoming
    .filter(
      ({ status, awaiting, ended }) =>
        (status === "confirmed" || status === "arrived") && !awaiting && ended,
    )
    .sort(
      (first, second) =>
        first.dayOffset - second.dayOffset ||
        first.startMinutes - second.startMinutes,
    );

  const today = getCalendarBookings(state, upcoming, (row) =>
    actions.openSheet("past", { selectedPastId: getPastKey(row) }),
  ).filter(({ dayOffset }) => dayOffset === 0);

  const next = today.find(({ ended }) => !ended);

  const limit = RANGE_DAYS[state.range] ?? 30;
  const { stats } = rangeData;
  const isGate = isGated(studio);

  const getHeroNext = () => {
    if (next)
      return `Next: ${next.clientName} at ${next.time} · ${next.service}`;

    return today.length
      ? "All done for today"
      : "Share your link to fill the day";
  };

  const getEmptyTitle = () => {
    if (!hasBookings) return "No appointments yet";

    if (state.range !== "today") return "Nothing booked in this range";

    return today.length ? "Nothing else today" : "Nothing booked today";
  };

  const onChartMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 340;
    const count = rangeData.chart.length;

    const index = Math.max(
      0,
      Math.min(count - 1, Math.round(((x - 8) / (340 - 16)) * (count - 1))),
    );

    if (index !== state.chartIndex) setState({ chartIndex: index });
  };

  return {
    upcoming,
    rangeData,
    chart,
    tipPoint: state.chartIndex != null ? chart.points[state.chartIndex] : null,
    hasChart: !isLoading && rangeData.chart.some((value) => value > 0),
    isChartEmpty:
      isError || (!isLoading && !rangeData.chart.some((value) => value > 0)),
    chartEmptyTitle: isError
      ? "Your numbers didn’t load"
      : "Nothing to chart yet",
    chartEmptyBody: isError
      ? "We’ll try again in a minute."
      : "Money you take will appear here.",
    due,
    today,
    homeUpcoming: upcoming
      .filter(({ dayOffset, ended }) => !ended && dayOffset < limit)
      .slice(0, isDesktop ? 5 : 3),
    statCards: (
      [
        ["Bookings", stats.bookings],
        ["Revenue", stats.revenue],
        ["Occupancy", stats.occupancy],
        ["New clients", stats.clients],
      ] as const
    ).map(([label, [value, delta]], index) => ({
      label,
      value: isLoading ? "—" : value,
      subtitle: isDesktop && !isLoading ? STAT_SUBTITLES[label] : "",
      delta: isLoading ? null : delta,
      delay: `${(index * 0.05).toFixed(2)}s`,
    })),
    feed: state.notifications.slice(0, 4),
    isGate,
    heroNext: getHeroNext(),
    emptyTitle: getEmptyTitle(),
    goCalendarToday: () => {
      setState({ tab: "bookings", dayIndex: 0, bookingsLayout: "cal" });
      actions.scrollBody(0, false);
      actions.scrollCalendarToNow();
    },
    copyLink: () => {
      if (isGate) {
        actions.showToast(GATE_REASON);

        return;
      }

      copyText(getBookingLink(state));
      actions.showToast("Booking link copied");
    },
    onChartMove,
  };
};

export type HomeView = ReturnType<typeof getHomeView>;
