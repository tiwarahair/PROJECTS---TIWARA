import { isPastIn } from "../core/model";
import type { BookingsContext } from "./context";
import { UPCOMING_FILTERS, getOptionLabel, isUpcomingMatch } from "./filters";
import { PAST_STATUS_OPTIONS } from "./types";
import type { FilterOption } from "./types";
import type { StudioState } from "../core/types";

const toChip = (
  { id, label }: FilterOption,
  isOn: boolean,
  pick: () => void,
  count: number,
) => ({ key: id, label, count: String(count), isOn, pick });

const getDraftState = ({ state }: BookingsContext): StudioState => ({
  ...state,
  ...state.filterDraft,
});

const pickDraft =
  ({ state, setState }: BookingsContext, patch: StudioState["filterDraft"]) =>
  () =>
    setState({ filterDraft: { ...state.filterDraft, ...patch } });

const getUpcomingSections = (context: BookingsContext) => {
  const draft = getDraftState(context);

  return UPCOMING_FILTERS.map((filter) => ({
    label: filter.label,
    options: filter.options.map((option) =>
      toChip(
        option,
        filter.read(draft) === option.id,
        pickDraft(context, filter.patch(option.id)),
        context.upcomingBase.filter((booking) =>
          isUpcomingMatch(draft, booking, { filter, id: option.id }),
        ).length,
      ),
    ),
  }));
};

const getPastSections = (context: BookingsContext) => {
  const { pastFilter = "all" } = getDraftState(context);

  return [
    {
      label: "Status",
      options: PAST_STATUS_OPTIONS.map((option) =>
        toChip(
          option,
          pastFilter === option.id,
          pickDraft(context, { pastFilter: option.id }),
          context.pastBase.filter((row) => isPastIn(row, option.id)).length,
        ),
      ),
    },
  ];
};

const getDraftCount = (context: BookingsContext) => {
  const draft = getDraftState(context);

  if (context.isPast)
    return context.pastBase.filter((row) =>
      isPastIn(row, draft.pastFilter || "all"),
    ).length;

  return context.upcomingBase.filter((booking) =>
    isUpcomingMatch(draft, booking),
  ).length;
};

const IDLE_FILTERS = {
  filterRange: "all",
  filterStatus: "all",
  filterPayment: "any",
  pastFilter: "all",
};

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
  const { studio, state, setState, query, isPast } = context;
  const filterCount = getFilterCount(context);
  const shownCount = getDraftCount(context);

  const closeFilter = () => {
    const { timers } = studio.context;

    setState({ filterOut: true });
    window.clearTimeout(timers.filter);

    timers.filter = window.setTimeout(
      () => setState({ filterOpen: false, filterOut: false, filterDraft: {} }),
      210,
    );
  };

  return {
    filterCount: filterCount ? String(filterCount) : "",
    isFilterActive: filterCount > 0 || !!query,
    filterChips: getFilterChips(context),
    clearFilter: () => setState({ ...IDLE_FILTERS, bookingsQuery: "" }),
    clearDraft: () => setState({ filterDraft: IDLE_FILTERS }),
    closeFilter,
    applyFilter: () => {
      setState({ ...state.filterDraft });
      closeFilter();
    },
    filterSections: isPast
      ? getPastSections(context)
      : getUpcomingSections(context),
    filterCta: `Show ${shownCount}${shownCount === 1 ? " booking" : " bookings"}`,
  };
};
