// Search's live data: the place, Google suggestions (from PlacesBridge), result pages, the filter sheet's total and stylist suggestions.
import { skipToken } from "@reduxjs/toolkit/query";
import { useDebouncedValue } from "../../hooks/use-debounced-value";
import { useIsSlow } from "../../hooks/use-is-slow";
import {
  usePeekStylistsQuery,
  useGetCatalogueQuery,
  useSearchStylistsInfiniteQuery,
} from "../../stores/api-slice";
import { EMPTY_CATALOGUE } from "../../lib/catalogue";
import { toResultCards } from "./cards";
import { getPlace, getStyleSelection, toSearchArgs } from "./logic";
import type { FilterDraft, SearchState } from "./state";
import { useCurrentPosition } from "./use-current-position";
import type { PlaceSuggestions } from "./use-place-suggestions";

const STYLIST_SUGGESTIONS = 8;

export const useSearchData = (
  state: SearchState,
  filterDraft: FilterDraft,
  places: PlaceSuggestions,
) => {
  const location = useCurrentPosition();

  const { data: loadedCatalogue, isError: isCatalogueError } =
    useGetCatalogueQuery();

  const catalogue = loadedCatalogue ?? EMPTY_CATALOGUE;

  const place = getPlace(state.query, location.position);

  const selection = getStyleSelection(
    state,
    isCatalogueError ? catalogue : loadedCatalogue,
  );

  // "Current location": hold the search briefly for the position rather than searching twice
  const isWaitingForPlace = location.isWaiting && !place.point;

  const isWaitingForCatalogue = !loadedCatalogue && !isCatalogueError;
  const isWaiting = isWaitingForPlace || !loadedCatalogue;

  const results = useSearchStylistsInfiniteQuery(
    isWaiting ? skipToken : toSearchArgs(state, place.point, catalogue),
    { refetchOnMountOrArgChange: 60 },
  );

  const draftPeek = usePeekStylistsQuery(
    { args: toSearchArgs(state, place.point, catalogue, filterDraft), size: 1 },
    { skip: !state.filtersOpen || !loadedCatalogue },
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
    isWaitingForPlace ||
    isWaitingForCatalogue ||
    (results.isFetching && !results.isFetchingNextPage);

  const isStylistsLoading = whatText !== typedWhat || stylistPeek.isFetching;

  // placeholders only once a wait is noticeable, or straight away while the device's location is on its way
  const isResultsSlow = useIsSlow(isLoading && !rows.length);
  const isSlow = isWaitingForPlace || isResultsSlow;
  const isSlowMore = useIsSlow(results.isFetchingNextPage);
  const isPlacesSlow = useIsSlow(places.isSearching);
  const isStylistsSlow = useIsSlow(isStylistsLoading);

  return {
    location,
    catalogue,
    place,
    selection,
    places: { ...places, isSlow: isPlacesSlow },
    cards: toResultCards(rows, selection),
    total: Number(rows[0]?.total_count ?? 0),
    isLoading,
    isSlow,
    isError: results.isError || isCatalogueError,
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
