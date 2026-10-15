// Search's live data: the place, Google suggestions, result pages, the filter sheet's total and stylist suggestions.
import { skipToken } from "@reduxjs/toolkit/query";
import { useDebouncedValue } from "../../hooks/use-debounced-value";
import { useIsSlow } from "../../hooks/use-is-slow";
import {
  usePeekStylistsQuery,
  useSearchStylistsInfiniteQuery,
} from "../../stores/api-slice";
import { toResultCards } from "./search-cards";
import { getPlace, getStyleSelection, toSearchArgs } from "./search-logic";
import type { FilterDraft, SearchState } from "./search-state";
import { useCurrentPosition } from "./use-current-position";
import { usePlaceSuggestions } from "./use-place-suggestions";

const STYLIST_SUGGESTIONS = 8;

export const useSearchData = (state: SearchState, filterDraft: FilterDraft) => {
  const location = useCurrentPosition();

  const place = getPlace(state.query, location.position);
  const selection = getStyleSelection(state);

  const places = usePlaceSuggestions(
    state.whereTyped ? (state.whereText ?? "") : "",
  );

  // "Current location": hold the search briefly for the position rather than searching twice
  const isWaitingForPlace = location.isWaiting && !place.point;

  const results = useSearchStylistsInfiniteQuery(
    isWaitingForPlace ? skipToken : toSearchArgs(state, place.point),
    { refetchOnMountOrArgChange: 60 },
  );

  const draftPeek = usePeekStylistsQuery(
    { args: toSearchArgs(state, place.point, filterDraft), size: 1 },
    { skip: !state.filtersOpen },
  );

  const typedWhat = state.whatTyped ? (state.whatText ?? "").trim() : "";
  const whatText = useDebouncedValue(typedWhat);

  const stylistPeek = usePeekStylistsQuery(
    {
      args: {
        lat: place.point?.lat,
        lng: place.point?.lng,
        search_text: whatText || undefined,
      },
      size: STYLIST_SUGGESTIONS,
    },
    { skip: !state.whatOpen },
  );

  // currentData: only these filters' pages (never the previous search's while new ones load)
  const rows = results.currentData?.pages.flat() ?? [];

  const isLoading =
    isWaitingForPlace || (results.isFetching && !results.isFetchingNextPage);

  const isStylistsLoading = whatText !== typedWhat || stylistPeek.isFetching;

  // placeholders only once a wait is noticeable
  const isSlow = useIsSlow(isLoading && !rows.length);
  const isSlowMore = useIsSlow(results.isFetchingNextPage);
  const isPlacesSlow = useIsSlow(places.isSearching);
  const isStylistsSlow = useIsSlow(isStylistsLoading);

  return {
    location,
    place,
    selection,
    places: { ...places, isSlow: isPlacesSlow },
    cards: toResultCards(rows, selection),
    total: Number(rows[0]?.total_count ?? 0),
    isLoading,
    isSlow,
    isError: results.isError,
    hasMore: !!results.hasNextPage,
    isLoadingMore: results.isFetchingNextPage,
    isSlowMore,
    loadMore: () => void results.fetchNextPage(),
    draftCount: Number(draftPeek.data?.[0]?.total_count ?? 0),
    stylistSuggestions: {
      rows: stylistPeek.currentData ?? [],
      // still typing (debounce) or fetching
      isLoading: isStylistsLoading,
      isSlow: isStylistsSlow,
    },
  };
};
