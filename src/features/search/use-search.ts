// State + actions for the Search page.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, KeyboardEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { getResults, getResultCards } from "./search-logic";
import { getFixturePatch } from "./search-fixtures";
import { getInitialState, getStateSearch, RADII } from "./search-state";
import type {
  FilterDraft,
  SearchState,
  SortKey,
  Venue,
  WhatChip,
} from "./search-state";
import { getWhatModel, getWhereModel } from "./search-suggestions";
import type { SuggestionRow } from "./search-suggestions";

type Patch =
  Partial<SearchState> | ((state: SearchState) => Partial<SearchState>);

const CLOSE_ALL: Partial<SearchState> = {
  whatOpen: false,
  whereOpen: false,
  whatText: null,
  whereText: null,
  whatTyped: false,
  whereTyped: false,
  whatIndex: -1,
  whereIndex: -1,
};

const CLOSE_WHAT: Partial<SearchState> = {
  whatText: null,
  whatTyped: false,
  whatOpen: false,
  whatIndex: -1,
};

const SHEET_CLOSE_MS = 330;

const DEFAULT_DRAFT: FilterDraft = {
  venues: [],
  maxPrice: null,
  radius: 10,
  sort: "distance",
};

/** Re-render on resize (pill width and mobile checks read window.innerWidth). */
const useViewportWidth = () => {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
};

export const useSearch = () => {
  const navigate = useNavigate();
  const { search: locationSearch } = useLocation();
  const viewportWidth = useViewportWidth();

  // read once: the state drives the URL from here on (the sync below), not the other way round
  const [state, setState] = useState<SearchState>(() =>
    getInitialState(locationSearch, window.innerWidth),
  );

  // read once from the URL the page opened with (the URL sync below drops ?fixture=)
  const [initialFixture] = useState(() =>
    new URLSearchParams(locationSearch).get("fixture"),
  );

  // the sync below compares against the current URL without re-running when only the URL changes
  const locationSearchRef = useRef(locationSearch);

  locationSearchRef.current = locationSearch;

  const update = useCallback(
    (patch: Patch) =>
      setState((current) => ({
        ...current,
        ...(typeof patch === "function" ? patch(current) : patch),
      })),
    [],
  );

  const stateRef = useRef(state);

  stateRef.current = state;
  const timersRef = useRef<number[]>([]);

  const later = (callback: () => void, delay: number) =>
    timersRef.current.push(window.setTimeout(callback, delay));

  const refs = {
    nav: useRef<HTMLElement>(null),
    what: useRef<HTMLInputElement>(null),
    whatMobile: useRef<HTMLInputElement>(null),
    where: useRef<HTMLInputElement>(null),
    whereMobile: useRef<HTMLInputElement>(null),
  };

  // --navh keeps the mobile filter bar under the sticky nav
  useEffect(() => {
    const setNavHeight = () => {
      const nav = refs.nav.current;

      if (nav)
        document.documentElement.style.setProperty(
          "--navh",
          `${nav.offsetHeight}px`,
        );
    };

    setNavHeight();
    const timer = window.setTimeout(setNavHeight, 400);

    window.addEventListener("resize", setNavHeight);

    // demo states are dev-only; production builds drop this branch and the fixtures module
    const fixturePatch =
      import.meta.env.DEV && initialFixture
        ? getFixturePatch(
            initialFixture,
            stateRef.current,
            window.innerWidth <= 720,
          )
        : null;

    const fixtureTimer = fixturePatch
      ? window.setTimeout(() => update(fixturePatch), 350)
      : 0;

    const timers = timersRef.current;

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fixtureTimer);
      window.removeEventListener("resize", setNavHeight);
      timers.forEach((pending) => window.clearTimeout(pending));
    };
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the URL in sync with the search (replace, no history entries)
  useEffect(() => {
    const search = getStateSearch(state);

    if (search !== locationSearchRef.current)
      // URL sync only: keep the scroll position (ScrollRestoration resets it on other navigations)
      navigate({ search }, { replace: true, preventScrollReset: true });
  }, [state, navigate]);

  const results = useMemo(() => getResults(state), [state]);
  const { selection, place } = results;
  const what = getWhatModel(state, selection);
  const where = getWhereModel(state, place);
  const isMobileSheet = !!state.mobileView;

  const focusLater = (ref: { current: HTMLInputElement | null }) =>
    window.setTimeout(() => ref.current?.focus(), 0);

  const pickWhat = (row: SuggestionRow) => {
    if (row.kind === "stylist" && row.stylist) {
      navigate(`/${row.stylist.id}`);

      return;
    }

    const styleQuery = { group: "", type: "", freeText: "" };

    if (row.kind === "group" && row.group) styleQuery.group = row.group.slug;
    else if (row.kind === "type" && row.serviceType)
      styleQuery.type = row.serviceType.slug;
    else if (row.kind === "all-results") styleQuery.freeText = row.raw ?? "";

    update((current) => ({
      query: { ...current.query, ...styleQuery },
      ...CLOSE_WHAT,
      ...(current.mobileView ? { mobileView: "menu" as const } : {}),
    }));
  };

  const pickLocation = (row: SuggestionRow) =>
    update((current) => ({
      query: {
        ...current.query,
        location: row.kind === "current" ? "Current location" : row.label,
      },
      whereText: null,
      whereTyped: false,
      whereOpen: false,
      whereIndex: -1,
      ...(current.mobileView ? { mobileView: "menu" as const } : {}),
    }));

  const getKeyHandler =
    (
      field: "what" | "where",
      flat: SuggestionRow[],
      pick: (row: SuggestionRow) => void,
      fallback: () => void,
    ) =>
    (event: KeyboardEvent<HTMLInputElement>) => {
      const indexKey = field === "what" ? "whatIndex" : "whereIndex";
      const count = flat.length;
      const current = stateRef.current[indexKey];

      if (event.key === "ArrowDown") {
        event.preventDefault();

        update({
          [indexKey]: count ? (current + 1) % count : -1,
          [`${field}Open`]: true,
        });
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const prevIndex = current <= 0 ? count - 1 : current - 1;

        update({ [indexKey]: count ? prevIndex : -1 });
      } else if (event.key === "Enter") {
        event.preventDefault();
        const row = current >= 0 ? flat[current] : undefined;

        if (row) pick(row);
        else fallback();
      } else if (event.key === "Escape") {
        event.preventDefault();
        const target = event.currentTarget;

        update((state) => ({
          [`${field}Open`]: false,
          [`${field}Text`]: null,
          [`${field}Typed`]: false,
          [indexKey]: -1,
          ...(state.mobileView ? { mobileView: "menu" as const } : {}),
        }));

        if (!stateRef.current.mobileView) target.blur();
      }
    };

  const closeSheet = (
    closingKey: "mobileClosing" | "filtersClosing",
    finished: Partial<SearchState>,
    extra: Partial<SearchState> = {},
  ) => {
    update({ [closingKey]: true, ...extra });
    later(() => update(finished), SHEET_CLOSE_MS);
  };

  const filterDraft = state.filtersDraft || DEFAULT_DRAFT;

  const setFilterDraft = (patch: Partial<FilterDraft>) =>
    update((current) => ({
      filtersDraft: { ...(current.filtersDraft || DEFAULT_DRAFT), ...patch },
    }));

  const clearDate = () =>
    update((current) => ({
      query: { ...current.query, date: "" },
      day: "",
      time: "any",
      draft: "any",
    }));

  const actions = {
    closeDropdowns: () => update(CLOSE_ALL),
    closeMobileSheet: () =>
      closeSheet(
        "mobileClosing",
        { mobileView: "", mobileClosing: false },
        CLOSE_ALL,
      ),
    mobileToMenu: () => update({ mobileView: "menu", ...CLOSE_ALL }),
    openMobileSheet: () => update({ mobileView: "menu" }),
    openMobileWhat: () =>
      update({
        mobileView: "service",
        whatText: selection.display,
        whatTyped: false,
        whatIndex: -1,
        whatOpen: true,
      }),
    openMobileWhere: () =>
      update({
        mobileView: "location",
        whereText: "",
        whereTyped: false,
        whereIndex: -1,
        whereOpen: true,
      }),
    openMobileDate: () => update({ mobileView: "date" }),
    clearStyle: () =>
      update((current) => ({
        query: { ...current.query, group: "", type: "", freeText: "" },
        whatText: null,
        whatTyped: false,
      })),
    clearArea: () =>
      update((current) => ({
        query: { ...current.query, location: "Current location" },
        whereText: null,
        whereTyped: false,
      })),
    search: () => {
      if (state.whatOpen && what.raw) {
        pickWhat({ kind: "all-results", label: "", raw: what.raw });

        return;
      }

      const firstLocation = where.locationRows[0];

      if (state.whereOpen && where.raw && firstLocation) {
        pickLocation(firstLocation);

        return;
      }

      update({ ...CLOSE_ALL, dateOpen: false });
    },
    // What
    pickWhat,
    focusWhat: (event: FocusEvent<HTMLInputElement>) => {
      const input = event.target;

      if (stateRef.current.whatOpen) return;

      update({
        whatOpen: true,
        whatText: selection.display,
        whatTyped: false,
        whatIndex: -1,
        whereOpen: false,
        whereText: null,
        whereTyped: false,
        dateOpen: false,
        priceOpen: false,
        sortOpen: false,
      });

      window.setTimeout(() => input.select(), 0);
    },
    changeWhat: (event: ChangeEvent<HTMLInputElement>) =>
      update({
        whatText: event.target.value,
        whatTyped: true,
        whatOpen: true,
        whatIndex: -1,
      }),
    keyWhat: getKeyHandler("what", what.flat, pickWhat, () => {
      if (what.raw) pickWhat({ kind: "all-results", label: "", raw: what.raw });
    }),
    clearWhat: () => {
      update((current) => ({
        query: { ...current.query, group: "", type: "", freeText: "" },
        whatText: "",
        whatTyped: false,
        whatOpen: true,
        whatIndex: -1,
      }));

      focusLater(isMobileSheet ? refs.whatMobile : refs.what);
    },
    pickWhatChip: (chip: WhatChip) => {
      update({ whatChip: chip, whatIndex: -1 });
      focusLater(isMobileSheet ? refs.whatMobile : refs.what);
    },
    hoverWhat: (index: number) => {
      if (stateRef.current.whatIndex !== index) update({ whatIndex: index });
    },
    // Where
    pickLocation,
    focusWhere: (event: FocusEvent<HTMLInputElement>) => {
      const input = event.target;

      if (stateRef.current.whereOpen) return;

      update({
        whereOpen: true,
        whereText: where.display,
        whereTyped: false,
        whereIndex: -1,
        whatOpen: false,
        whatText: null,
        whatTyped: false,
        dateOpen: false,
        priceOpen: false,
        sortOpen: false,
      });

      window.setTimeout(() => input.select(), 0);
    },
    changeWhere: (event: ChangeEvent<HTMLInputElement>) =>
      update({
        whereText: event.target.value,
        whereTyped: true,
        whereOpen: true,
        whereIndex: -1,
      }),
    keyWhere: getKeyHandler("where", where.flat, pickLocation, () => {
      const firstLocation = where.locationRows[0];

      if (where.raw && firstLocation) pickLocation(firstLocation);
    }),
    clearWhere: () => {
      update((current) => ({
        query: { ...current.query, location: "Current location" },
        whereText: "",
        whereTyped: false,
        whereOpen: true,
        whereIndex: -1,
      }));

      focusLater(isMobileSheet ? refs.whereMobile : refs.where);
    },
    hoverWhere: (index: number) => {
      if (stateRef.current.whereIndex !== index) update({ whereIndex: index });
    },
    // When
    openDate: () =>
      update((current) => ({
        dateOpen: true,
        draft: current.time,
        ...CLOSE_ALL,
      })),
    closeDate: () => update({ dateOpen: false }),
    clearDate,
    prevMonth: (month: Date) =>
      update({
        calendarMonth: new Date(month.getFullYear(), month.getMonth() - 1, 1),
      }),
    nextMonth: (month: Date) =>
      update({
        calendarMonth: new Date(month.getFullYear(), month.getMonth() + 1, 1),
      }),
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
    // Filters
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
          location: "Current location",
        },
        day: "",
        time: "any",
        draft: "any",
        venues: [],
        maxPrice: null,
        radius: 10,
        sort: "distance",
        ...CLOSE_ALL,
      }),
    openFilters: () =>
      update((current) => ({
        filtersOpen: true,
        filtersClosing: false,
        filtersDraft: {
          venues: current.venues.slice(),
          maxPrice: current.maxPrice,
          radius: current.radius,
          sort: current.sort,
        },
      })),
    closeFilters: () =>
      closeSheet("filtersClosing", {
        filtersOpen: false,
        filtersClosing: false,
        filtersDraft: null,
      }),
    setFilterDraft,
    clearFilterDraft: () =>
      update((current) => ({
        filtersDraft: {
          venues: [],
          maxPrice: null,
          radius: 10,
          sort: current.sort,
        },
      })),
    applyFilters: () => {
      update({
        venues: filterDraft.venues,
        maxPrice: filterDraft.maxPrice,
        radius: filterDraft.radius || 10,
      });

      closeSheet("filtersClosing", {
        filtersOpen: false,
        filtersClosing: false,
        filtersDraft: null,
      });
    },
  };

  // empty-state suggestions
  const nextRadius = RADII.find((radius) => radius > state.radius);

  const suggestions = [
    ...(state.query.date || state.time !== "any"
      ? [{ key: "d", label: "Try any date", pick: clearDate }]
      : []),
    ...(nextRadius
      ? [
          {
            key: "r",
            label: `Widen to ${nextRadius} miles`,
            pick: () => update({ radius: nextRadius }),
          },
        ]
      : []),
    ...(state.maxPrice != null
      ? [
          {
            key: "p",
            label: "Remove price limit",
            pick: () => update({ maxPrice: null }),
          },
        ]
      : []),
    ...(selection.serviceType && selection.group
      ? [
          {
            key: "g",
            label: `Try ${selection.group.name}`,
            pick: () =>
              update((current) => ({
                query: {
                  ...current.query,
                  type: "",
                  group: selection.group?.slug ?? "",
                },
              })),
          },
        ]
      : []),
  ];

  return {
    state,
    refs,
    viewportWidth,
    selection,
    place,
    what,
    where,
    cards: getResultCards(results.list, selection),
    draftCount: state.filtersOpen
      ? getResults(state, filterDraft).list.length
      : 0,
    filterDraft,
    suggestions,
    actions,
  };
};

export type SearchController = ReturnType<typeof useSearch>;
