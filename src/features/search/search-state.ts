// Search page state, initialised from the URL exactly like the prototype constructor.

export type SortKey = "distance" | "earliest" | "price" | "price-desc";
export type Venue = "Salon" | "Home-based" | "Mobile";
export type MobileView = "" | "menu" | "service" | "location" | "date";
export type WhatChip = "all" | "styles" | "stylists";

export interface SearchQuery {
  group: string;
  type: string;
  date: string;
  location: string;
  freeText: string;
}

export interface FilterDraft {
  venues: Venue[];
  maxPrice: number | null;
  radius?: number;
  sort: SortKey;
}

export interface SearchState {
  query: SearchQuery;
  day: string;
  expanded: boolean;
  mobileView: MobileView;
  mobileClosing: boolean;
  serviceOpen: boolean;
  locationOpen: boolean;
  dateOpen: boolean;
  calendarMonth: Date | null;
  venue: string;
  timeOpen: boolean;
  timeClosing: boolean;
  time: string;
  draft: string;
  customFrom: string;
  customTo: string;
  pickerQuery: string;
  radius: number;
  venues: Venue[];
  maxPrice: number | null;
  distanceOpen: boolean;
  sort: SortKey;
  whatText: string | null;
  whatTyped: boolean;
  whatOpen: boolean;
  whatChip: WhatChip;
  whatIndex: number;
  whereText: string | null;
  whereTyped: boolean;
  whereOpen: boolean;
  whereIndex: number;
  priceOpen: boolean;
  sortOpen: boolean;
  filtersOpen: boolean;
  filtersClosing: boolean;
  filtersDraft: FilterDraft | null;
}

const VENUE_PARAMS: Record<string, Venue> = {
  salon: "Salon",
  "home-based": "Home-based",
  mobile: "Mobile",
};

const SORT_PARAMS: Record<string, SortKey> = {
  distance: "distance",
  earliest: "earliest",
  price: "price",
  "price-desc": "price-desc",
  soonest: "earliest",
  nearest: "distance",
};

export const RADII = [5, 10, 15, 25];

export const getInitialState = (
  search: string,
  viewportWidth: number,
): SearchState => {
  const params = new URLSearchParams(search);
  const time = params.get("time") || "any";
  const isCustom = /^\d/.test(time);
  const maxPrice = parseInt(params.get("maxPrice") ?? "", 10);
  const distance = Number(params.get("dist"));

  const state: SearchState = {
    query: {
      group: params.get("group") || params.get("service") || "",
      type: params.get("type") || "",
      date: params.get("date") || "",
      location: params.get("loc") || "Current location",
      freeText: params.get("q") || "",
    },
    day: params.get("date") || "",
    expanded: false,
    mobileView: "",
    mobileClosing: false,
    serviceOpen: false,
    locationOpen: false,
    dateOpen: false,
    calendarMonth: null,
    venue: VENUE_PARAMS[params.get("venue") ?? ""] || "All",
    timeOpen: false,
    timeClosing: false,
    time: isCustom ? "custom" : time,
    draft: isCustom ? "custom" : time,
    customFrom: isCustom ? (time.split("-")[0] ?? "8am") : "8am",
    customTo: isCustom ? time.split("-")[1] || "6pm" : "6pm",
    pickerQuery: params.get("picker") || "",
    radius: RADII.includes(distance) ? distance : 10,
    venues: (params.get("venue") || "")
      .split(",")
      .map((venue) => VENUE_PARAMS[venue])
      .filter((venue): venue is Venue => !!venue),
    maxPrice: maxPrice >= 0 && maxPrice < 250 ? maxPrice : null,
    distanceOpen: false,
    sort: SORT_PARAMS[params.get("sort") ?? ""] || "distance",
    whatText: null,
    whatTyped: false,
    whatOpen: false,
    whatChip: "all",
    whatIndex: -1,
    whereText: null,
    whereTyped: false,
    whereOpen: false,
    whereIndex: -1,
    priceOpen: false,
    sortOpen: false,
    filtersOpen: false,
    filtersClosing: false,
    filtersDraft: null,
  };

  if (params.has("picker")) {
    const picker = params.get("picker") ?? "";

    Object.assign(state, {
      whatText: picker,
      whatTyped: !!picker,
      whatOpen: true,
    });

    if (viewportWidth <= 720) state.mobileView = "service";
  }

  return state;
};

/** The URL the page keeps in sync with its state (prototype componentDidUpdate). */
export const getStateSearch = ({
  query,
  time,
  customFrom,
  customTo,
  venues,
  maxPrice,
  radius,
  sort,
}: SearchState): string => {
  const params = new URLSearchParams();

  if (query.type) params.set("type", query.type);
  else if (query.group) params.set("group", query.group);
  else if (query.freeText) params.set("q", query.freeText);

  if (query.location && query.location !== "Current location")
    params.set("loc", query.location);

  if (query.date) params.set("date", query.date);

  if (time !== "any")
    params.set("time", time === "custom" ? `${customFrom}-${customTo}` : time);

  if (venues.length)
    params.set("venue", venues.map((venue) => venue.toLowerCase()).join(","));

  if (maxPrice != null) params.set("maxPrice", String(maxPrice));

  if (radius !== 10) params.set("dist", String(radius));

  if (sort !== "distance") params.set("sort", sort);

  return params.toString() ? `?${params.toString()}` : "";
};

/** Board fixtures (prototype componentDidMount F map), applied 350ms after mount. */
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
