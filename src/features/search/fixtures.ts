// Search's ?fixture= board states (dev-only).
import type { SearchState } from "./state";

/** Board fixtures, applied 350ms after mount. */
export const getFixturePatch = (
  fixture: string,
  state: SearchState,
  isMobile: boolean,
): Partial<SearchState> | null => {
  const what = (
    text: string,
    extra: Partial<SearchState> = {},
  ): Partial<SearchState> => ({
    whatOpen: true,
    whatText: text,
    whatTyped: !!text,
    whatIndex: -1,
    ...(isMobile ? { mobileView: "service" as const } : {}),
    ...extra,
  });

  const fixtures: Record<string, Partial<SearchState>> = {
    "what-empty": what(""),
    "what-stylists": what("", { whatChip: "stylists" }),
    "what-knot": what("knot"),
    "what-nomatch": what("zzq"),
    "where-empty": {
      whereOpen: true,
      whereText: "",
      whereTyped: false,
      ...(isMobile ? { mobileView: "location" as const } : {}),
    },
    "where-chor": {
      whereOpen: true,
      whereText: "chor",
      whereTyped: true,
      ...(isMobile ? { mobileView: "location" as const } : {}),
    },
    "price-open": isMobile
      ? {
          filtersOpen: true,
          filtersDraft: {
            venues: state.venues.slice(),
            maxPrice: state.maxPrice == null ? 80 : state.maxPrice,
            sort: state.sort,
          },
        }
      : { priceOpen: true },
    "sort-open": { sortOpen: true },
    "mob-sheet": { mobileView: "menu" },
    "mob-filters": {
      filtersOpen: true,
      filtersDraft: {
        venues: state.venues.slice(),
        maxPrice: state.maxPrice,
        sort: state.sort,
      },
    },
  };

  return fixtures[fixture] ?? null;
};
