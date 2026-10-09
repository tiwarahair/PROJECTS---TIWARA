// Search page state, initialised from the URL exactly like the prototype constructor.

export type SortKey = "distance" | "earliest" | "price";
export type Venue = "Salon" | "Home-based" | "Mobile";
export type MobileView = "" | "menu" | "service" | "location" | "date";
export type WhatChip = "all" | "styles" | "stylists";

export interface SearchQuery {
  group: string;
  type: string;
  date: string;
  loc: string;
  qq: string;
}

export interface FilterDraft {
  venues: Venue[];
  maxPrice: number | null;
  radius?: number;
  sort: SortKey;
}

export interface SearchState {
  q: SearchQuery;
  day: string;
  expanded: boolean;
  mob: MobileView;
  mobClosing: boolean;
  svcOpen: boolean;
  locOpen: boolean;
  dateOpen: boolean;
  calM: Date | null;
  venue: string;
  timeOpen: boolean;
  timeClosing: boolean;
  time: string;
  draft: string;
  cFrom: string;
  cTo: string;
  pq: string;
  radius: number;
  venues: Venue[];
  maxPrice: number | null;
  distOpen: boolean;
  sort: SortKey;
  whatText: string | null;
  whatTyped: boolean;
  whatOpen: boolean;
  whatChip: WhatChip;
  whatIdx: number;
  whereText: string | null;
  whereTyped: boolean;
  whereOpen: boolean;
  whereIdx: number;
  priceOpen: boolean;
  sortOpen: boolean;
  fOpen: boolean;
  fClosing: boolean;
  fDraft: FilterDraft | null;
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
    q: {
      group: params.get("group") || params.get("service") || "",
      type: params.get("type") || "",
      date: params.get("date") || "",
      loc: params.get("loc") || "Current location",
      qq: params.get("q") || "",
    },
    day: params.get("date") || "",
    expanded: false,
    mob: "",
    mobClosing: false,
    svcOpen: false,
    locOpen: false,
    dateOpen: false,
    calM: null,
    venue: VENUE_PARAMS[params.get("venue") ?? ""] || "All",
    timeOpen: false,
    timeClosing: false,
    time: isCustom ? "custom" : time,
    draft: isCustom ? "custom" : time,
    cFrom: isCustom ? (time.split("-")[0] ?? "8am") : "8am",
    cTo: isCustom ? time.split("-")[1] || "6pm" : "6pm",
    pq: params.get("picker") || "",
    radius: RADII.includes(distance) ? distance : 10,
    venues: (params.get("venue") || "")
      .split(",")
      .map((venue) => VENUE_PARAMS[venue])
      .filter((venue): venue is Venue => !!venue),
    maxPrice: maxPrice >= 0 && maxPrice < 250 ? maxPrice : null,
    distOpen: false,
    sort: SORT_PARAMS[params.get("sort") ?? ""] || "distance",
    whatText: null,
    whatTyped: false,
    whatOpen: false,
    whatChip: "all",
    whatIdx: -1,
    whereText: null,
    whereTyped: false,
    whereOpen: false,
    whereIdx: -1,
    priceOpen: false,
    sortOpen: false,
    fOpen: false,
    fClosing: false,
    fDraft: null,
  };
  if (params.has("picker")) {
    const picker = params.get("picker") ?? "";
    Object.assign(state, {
      whatText: picker,
      whatTyped: !!picker,
      whatOpen: true,
    });
    if (viewportWidth <= 720) state.mob = "service";
  }
  return state;
};

/** The URL the page keeps in sync with its state (prototype componentDidUpdate). */
export const getStateSearch = ({
  q,
  time,
  cFrom,
  cTo,
  venues,
  maxPrice,
  radius,
  sort,
}: SearchState): string => {
  const params = new URLSearchParams();
  if (q.type) params.set("type", q.type);
  else if (q.group) params.set("group", q.group);
  else if (q.qq) params.set("q", q.qq);
  if (q.loc && q.loc !== "Current location") params.set("loc", q.loc);
  if (q.date) params.set("date", q.date);
  if (time !== "any")
    params.set("time", time === "custom" ? cFrom + "-" + cTo : time);
  if (venues.length)
    params.set("venue", venues.map((venue) => venue.toLowerCase()).join(","));
  if (maxPrice != null) params.set("maxPrice", String(maxPrice));
  if (radius !== 10) params.set("dist", String(radius));
  if (sort !== "distance") params.set("sort", sort);
  return params.toString() ? "?" + params.toString() : "";
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
    whatIdx: -1,
    ...(isMobile ? { mob: "service" as const } : {}),
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
      ...(isMobile ? { mob: "location" as const } : {}),
    },
    "where-chor": {
      whereOpen: true,
      whereText: "chor",
      whereTyped: true,
      ...(isMobile ? { mob: "location" as const } : {}),
    },
    "price-open": isMobile
      ? {
          fOpen: true,
          fDraft: {
            venues: state.venues.slice(),
            maxPrice: state.maxPrice == null ? 80 : state.maxPrice,
            sort: state.sort,
          },
        }
      : { priceOpen: true },
    "sort-open": { sortOpen: true },
    "mob-sheet": { mob: "menu" },
    "mob-filters": {
      fOpen: true,
      fDraft: {
        venues: state.venues.slice(),
        maxPrice: state.maxPrice,
        sort: state.sort,
      },
    },
  };
  return fixtures[fixture] ?? null;
};
