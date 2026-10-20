import type { PointerEvent } from "react";
import { GATE_REASON } from "../core/constants";
import { RANGE_DATA } from "../core/seed-dashboard";
import { getDecoratedBookings } from "../bookings/decorate";
import { copyText, makeChart } from "../core/format";
import { getBookingLink } from "../core/model";
import { isGated } from "../shell";
import type { StudioController } from "../core/use-studio";

// desktop cards are stretched to the hero's height, so a quiet line under the number fills the room
const STAT_SUBTITLES: Record<string, string> = {
  Bookings: "vs last period",
  Revenue: "completed bookings",
  Occupancy: "of working hours",
  "New clients": "first visits",
};

// how many days ahead each range looks; anything else falls back to 30
const RANGE_DAYS: Record<string, number> = { today: 1, week: 7 };

const getZeroStat = (label: string) => (label === "Revenue" ? "£0" : "0");

export const getHomeView = (studio: StudioController) => {
  const { state, setState, isDesktop, isNew, hasBookings, actions } = studio;

  const upcoming = getDecoratedBookings(state, (booking) =>
    actions.openSheet("booking", { sheetBookingId: booking.id }),
  );

  const rangeData = RANGE_DATA[state.range];
  const chart = makeChart(rangeData.chart);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

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

  const today = upcoming
    .filter(({ dayOffset }) => dayOffset === 0)
    .sort((first, second) => first.startMinutes - second.startMinutes);

  const next = today.find(
    ({ startMinutes, durationMinutes }) =>
      startMinutes + durationMinutes > nowMinutes,
  );

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

    return state.range === "today"
      ? "Nothing booked today"
      : "Nothing booked in this range";
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
    due,
    today,
    homeUpcoming: upcoming
      .filter(({ dayOffset }) => dayOffset >= 0 && dayOffset < limit)
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
      value: isNew ? getZeroStat(label) : value,
      subtitle: isDesktop && !isNew ? STAT_SUBTITLES[label] : "",
      delta: isNew ? "" : delta,
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
