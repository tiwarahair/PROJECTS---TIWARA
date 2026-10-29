import { roundToPence } from "../../../utils/money";
import { PAST_MONTHS } from "../core/constants";
import { dayInfo } from "../core/format";
import { getLinkDue } from "./checkout-label";
import type { BookingsContext } from "./context";
import type { DecoratedBooking } from "./decorate";
import { getFilterCount } from "./filter-view";
import { getPastItem } from "./past-item";
import { DAY_NAMES, EMPTY_COPY } from "./types";
import type { EmptyKind } from "./types";

const getTotal = (items: { price: number }[]) => {
  let total = 0;

  for (const { price } of items) total += price;

  return total;
};

const getCountLabel = (count: number, noun: string) =>
  count + (count === 1 ? ` ${noun}` : ` ${noun}s`);

const getUpcomingGroups = (items: DecoratedBooking[]) => {
  const offsets = [...new Set(items.map(({ dayOffset }) => dayOffset))];

  return offsets.map((dayOffset, index) => {
    const dayItems = items.filter((item) => item.dayOffset === dayOffset);

    return {
      key: String(dayOffset),
      isLast: index === offsets.length - 1,
      label: DAY_NAMES[dayOffset] ?? dayInfo(dayOffset).label,
      isToday: dayOffset === 0,
      meta: `${getCountLabel(dayItems.length, "booking")} · £${getTotal(dayItems)}`,
      items: dayItems,
    };
  });
};

const getPastGroups = ({ studio, pastItems }: BookingsContext) => {
  const items = pastItems.map((row, index) => ({
    month:
      row.month ?? (PAST_MONTHS[row.when.split(" ")[2] ?? ""] || "Earlier"),
    item: getPastItem(studio, row, index),
  }));

  return [...new Set(items.map(({ month }) => month))].map((month) => ({
    month,
    items: items
      .filter((entry) => entry.month === month)
      .map(({ item }) => item),
  }));
};

const getListSummary = ({
  state,
  isPast,
  pastFilter,
  pastItems,
  upcomingItems,
}: BookingsContext) => {
  if (!isPast)
    return (
      getCountLabel(upcomingItems.length, "booking") +
      (state.filterRange === "all" ? " upcoming" : "")
    );

  const pastLabel = getCountLabel(pastItems.length, "appointment");

  if (pastFilter === "off") return `${pastLabel} did not go ahead`;

  const completedCount = pastItems.filter(
    ({ status }) => status === "Completed",
  ).length;

  return `${pastLabel} · ${completedCount} completed`;
};

const getEmptyKind = (context: BookingsContext): EmptyKind => {
  if (!context.studio.hasBookings) return "new";

  if (getFilterCount(context) > 0 || context.query) return "filtered";

  if (context.isPast) return "past";

  return "upcoming";
};

export const getListView = (context: BookingsContext) => {
  const { isPast, pastItems, upcomingItems, state, actions } = context;
  const { title, body } = EMPTY_COPY[getEmptyKind(context)];

  const earned = getTotal(
    pastItems
      .filter(({ status }) => status === "Completed")
      .map((row) => ({
        price: roundToPence(row.price - (getLinkDue(row) ?? 0)),
      })),
  );

  return {
    upcomingGroups: getUpcomingGroups(upcomingItems),
    listSummary: getListSummary(context),
    listTotal: isPast
      ? `£${earned} earned`
      : `£${getTotal(upcomingItems)} booked`,
    isListEmpty: isPast ? pastItems.length === 0 : upcomingItems.length === 0,
    listEmptyTitle: title,
    listEmptyBody: body,
    // ---- past list ----
    pastGroups: getPastGroups(context),
    hasOlderPast: isPast && !!state.pastCursor,
    olderPastLabel: state.isPastLoading
      ? "Loading…"
      : "Show older appointments",
    loadOlderPast: () => void actions.loadOlderPast(),
  };
};
