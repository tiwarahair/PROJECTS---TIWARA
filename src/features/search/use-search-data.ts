// Search's live data: the place, Google suggestions, result pages, the filter sheet's total and stylist suggestions.
import { useDebouncedValue } from "../../hooks/use-debounced-value";
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

  const results = useSearchStylistsInfiniteQuery(
    toSearchArgs(state, place.point),
  );

  const draftPeek = usePeekStylistsQuery(
    { args: toSearchArgs(state, place.point, filterDraft), size: 1 },
    { skip: !state.filtersOpen },
  );

  const whatText = useDebouncedValue(
    state.whatTyped ? (state.whatText ?? "").trim() : "",
  );

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

  const rows = results.data?.pages.flat() ?? [];

  return {
    location,
    place,
    selection,
    places,
    cards: toResultCards(rows, selection),
    total: Number(rows[0]?.total_count ?? 0),
    isLoading: results.isFetching && !results.isFetchingNextPage,
    isError: results.isError,
    hasMore: !!results.hasNextPage,
    isLoadingMore: results.isFetchingNextPage,
    loadMore: () => void results.fetchNextPage(),
    draftCount: Number(draftPeek.data?.[0]?.total_count ?? 0),
    stylistSuggestions: stylistPeek.data ?? [],
  };
};
