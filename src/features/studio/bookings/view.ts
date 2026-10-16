// Studio → Bookings values: the calendar / list block, the timeline block, past groups and filters.
import { dateAt } from "../core/format";
import type { StudioController } from "../core/use-studio";
import { getContext } from "./context";
import { getDateNav } from "./date-nav";
import { getDayTimeline } from "./day-timeline";
import { getFilterView } from "./filter-view";
import { getListView } from "./list-view";
import { getWeekTimeline } from "./week-timeline";

export const getBookingsView = (studio: StudioController) => {
  const context = getContext(studio);
  const { upcoming, isList, isUpcoming, isPast, state } = context;

  const weekMonday =
    state.dayIndex - ((dateAt(state.dayIndex).getDay() + 6) % 7);

  return {
    upcoming,
    isList,
    isCalendar: !isList,
    isUpcoming,
    isPast,
    ...getFilterView(context),
    ...getListView(context),
    // timeline
    ...getDayTimeline(context),
    ...getWeekTimeline(context, weekMonday),
    ...getDateNav(context, weekMonday),
  };
};

export type BookingsView = ReturnType<typeof getBookingsView>;
