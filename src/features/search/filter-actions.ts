// When (date and time), the filter popovers, the filters sheet and Clear filters.
import type { ChangeEvent } from "react";
import { CURRENT_PLACE } from "./state";
import type { FilterDraft, SearchState, SortKey, Venue } from "./state";
import { CLOSE_ALL, DEFAULT_DRAFT } from "./update";
import type { Update } from "./update";

type CloseSheet = (
  closingKey: "mobileClosing" | "filtersClosing",
  finished: Partial<SearchState>,
  extra?: Partial<SearchState>,
) => void;

const FILTERS_CLOSED: Partial<SearchState> = {
  filtersOpen: false,
  filtersClosing: false,
  filtersDraft: null,
};

const toMonth = (month: Date, delta: number) =>
  new Date(month.getFullYear(), month.getMonth() + delta, 1);

export const createFilterActions = (
  update: Update,
  closeSheet: CloseSheet,
  filterDraft: FilterDraft,
) => {
  const clearDate = () =>
    update((current) => ({
      query: { ...current.query, date: "" },
      day: "",
      time: "any",
      draft: "any",
    }));

  return {
    // When
    openDate: () =>
      update((current) => ({
        dateOpen: true,
        draft: current.time,
        ...CLOSE_ALL,
      })),
    closeDate: () => update({ dateOpen: false }),
    clearDate,
    prevMonth: (month: Date) => update({ calendarMonth: toMonth(month, -1) }),
    nextMonth: (month: Date) => update({ calendarMonth: toMonth(month, 1) }),
    pickDay: (value: string) =>
      update((current) => ({
        query: { ...current.query, date: value },
        day: value,
        dateOpen: false,
      })),
    pickTime: (id: string) => update({ draft: id, time: id }),
    changeFrom: (event: ChangeEvent<HTMLSelectElement>) =>
      update({ customFrom: event.target.value }),
    changeTo: (event: ChangeEvent<HTMLSelectElement>) =>
      update({ customTo: event.target.value }),
    // Filter popovers
    setVenues: (venues: Venue[]) => update({ venues }),
    togglePrice: () =>
      update((current) => ({
        priceOpen: !current.priceOpen,
        sortOpen: false,
        distanceOpen: false,
      })),
    closePrice: () => update({ priceOpen: false }),
    setMaxPrice: (maxPrice: number | null) => update({ maxPrice }),
    toggleSort: () =>
      update((current) => ({ sortOpen: !current.sortOpen, priceOpen: false })),
    closeSort: () => update({ sortOpen: false }),
    pickSort: (sort: SortKey) => update({ sort, sortOpen: false }),
    toggleDistance: () =>
      update((current) => ({
        distanceOpen: !current.distanceOpen,
        priceOpen: false,
        sortOpen: false,
      })),
    closeDistance: () => update({ distanceOpen: false }),
    pickDistance: (radius: number) => update({ radius, distanceOpen: false }),
    clearAll: () =>
      update({
        query: {
          group: "",
          type: "",
          freeText: "",
          date: "",
          ...CURRENT_PLACE,
        },
        day: "",
        time: "any",
        draft: "any",
        ...DEFAULT_DRAFT,
        ...CLOSE_ALL,
      }),
    // Filters sheet: edits a draft, applied on "Show N stylists"
    openFilters: () =>
      update(({ venues, maxPrice, radius, sort }) => ({
        filtersOpen: true,
        filtersClosing: false,
        filtersDraft: { venues: venues.slice(), maxPrice, radius, sort },
      })),
    closeFilters: () => closeSheet("filtersClosing", FILTERS_CLOSED),
    setFilterDraft: (patch: Partial<FilterDraft>) =>
      update((current) => ({
        filtersDraft: { ...(current.filtersDraft || DEFAULT_DRAFT), ...patch },
      })),
    clearFilterDraft: () =>
      update((current) => ({
        filtersDraft: { ...DEFAULT_DRAFT, sort: current.sort },
      })),
    applyFilters: () => {
      update({
        venues: filterDraft.venues,
        maxPrice: filterDraft.maxPrice,
        radius: filterDraft.radius || 10,
      });

      closeSheet("filtersClosing", FILTERS_CLOSED);
    },
  };
};
