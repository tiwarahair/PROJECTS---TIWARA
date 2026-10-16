import { isPastIn } from "../core/model";
import type { BookingsContext } from "./context";
import { UPCOMING_FILTERS, getOptionLabel, isUpcomingMatch } from "./filters";
import { PAST_STATUS_OPTIONS } from "./types";
import type { FilterOption } from "./types";

const toChip = (
  { id, label }: FilterOption,
  isOn: boolean,
  pick: () => void,
  count: number,
) => ({ key: id, label, count: String(count), isOn, pick });

const getUpcomingSections = ({
  state,
  setState,
  upcomingBase,
}: BookingsContext) =>
  UPCOMING_FILTERS.map((filter) => ({
    label: filter.label,
    options: filter.options.map((option) =>
      toChip(
        option,
        filter.read(state) === option.id,
        () => setState(filter.patch(option.id)),
        upcomingBase.filter((booking) =>
          isUpcomingMatch(state, booking, { filter, id: option.id }),
        ).length,
      ),
    ),
  }));

const getPastSections = ({
  setState,
  pastBase,
  pastFilter,
}: BookingsContext) => [
  {
    label: "Status",
    options: PAST_STATUS_OPTIONS.map((option) =>
      toChip(
        option,
        pastFilter === option.id,
        () => setState({ pastFilter: option.id }),
        pastBase.filter((row) => isPastIn(row, option.id)).length,
      ),
    ),
  },
];

export const getFilterCount = ({
  state,
  isPast,
  pastFilter,
}: BookingsContext) =>
  isPast
    ? Number(pastFilter !== "all")
    : UPCOMING_FILTERS.filter(({ read, idle }) => read(state) !== idle).length;

const getFilterChips = (context: BookingsContext) => {
  const { state, setState, isUpcoming, pastFilter } = context;

  if (isUpcoming)
    return UPCOMING_FILTERS.filter(
      ({ read, idle }) => read(state) !== idle,
    ).map(({ options, read, patch, idle }) => ({
      label: getOptionLabel(options, read(state)),
      clear: () => setState(patch(idle)),
    }));

  return pastFilter !== "all"
    ? [
        {
          label: getOptionLabel(PAST_STATUS_OPTIONS, pastFilter),
          clear: () => setState({ pastFilter: "all" }),
        },
      ]
    : [];
};

export const getFilterView = (context: BookingsContext) => {
  const { studio, setState, query, isPast, pastItems, upcomingItems } = context;
  const filterCount = getFilterCount(context);
  const shownCount = isPast ? pastItems.length : upcomingItems.length;

  return {
    filterCount: filterCount ? String(filterCount) : "",
    isFilterActive: filterCount > 0 || !!query,
    filterChips: getFilterChips(context),
    clearFilter: () =>
      setState({
        filterRange: "all",
        filterStatus: "all",
        filterPayment: "any",
        pastFilter: "all",
        bookingsQuery: "",
      }),
    closeFilter: () => {
      const { timers } = studio.context;

      setState({ filterOut: true });
      window.clearTimeout(timers.filter);

      timers.filter = window.setTimeout(
        () => setState({ filterOpen: false, filterOut: false }),
        210,
      );
    },
    filterSections: isPast
      ? getPastSections(context)
      : getUpcomingSections(context),
    filterCta: `Show ${shownCount}${shownCount === 1 ? " booking" : " bookings"}`,
  };
};
