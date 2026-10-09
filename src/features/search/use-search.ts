// State + actions for the Search page (prototype Search class: constructor, lifecycle and renderVals closures).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { calcResults, getResultCards } from "./search-logic";
import {
  getInitialState,
  getFixturePatch,
  getStateSearch,
  RADII,
} from "./search-state";
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
  whatIdx: -1,
  whereIdx: -1,
};
const CLOSE_WHAT: Partial<SearchState> = {
  whatText: null,
  whatTyped: false,
  whatOpen: false,
  whatIdx: -1,
};
const SHEET_CLOSE_MS = 330;
const DEFAULT_DRAFT: FilterDraft = {
  venues: [],
  maxPrice: null,
  radius: 10,
  sort: "distance",
};

/** Re-render on resize (pill width, mobile checks read window.innerWidth like the prototype). */
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
  const viewportWidth = useViewportWidth();
  const [state, setState] = useState<SearchState>(() =>
    getInitialState(window.location.search, window.innerWidth),
  );
  // read once from the URL the page opened with (the URL sync below drops ?fixture=)
  const [initialFixture] = useState(() =>
    new URLSearchParams(window.location.search).get("fixture"),
  );
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
          nav.offsetHeight + "px",
        );
    };
    setNavHeight();
    const timer = window.setTimeout(setNavHeight, 400);
    window.addEventListener("resize", setNavHeight);
    const fixturePatch = initialFixture
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
    if (search !== window.location.search)
      navigate({ search }, { replace: true });
  }, [state, navigate]);

  const results = useMemo(() => calcResults(state), [state]);
  const { selection, place } = results;
  const what = getWhatModel(state, selection);
  const where = getWhereModel(state, place);
  const isMobileSheet = !!state.mob;

  const focusLater = (ref: { current: HTMLInputElement | null }) =>
    window.setTimeout(() => ref.current?.focus(), 0);

  const pickWhat = (row: SuggestionRow) => {
    if (row.kind === "stylist" && row.st) {
      navigate("/stylist?stylist=" + row.st.id);
      return;
    }
    const query = { group: "", type: "", qq: "" };
    if (row.kind === "group" && row.g) query.group = row.g.slug;
    else if (row.kind === "type" && row.t) query.type = row.t.slug;
    else if (row.kind === "all-results") query.qq = row.raw ?? "";
    update((current) => ({
      q: { ...current.q, ...query },
      ...CLOSE_WHAT,
      ...(current.mob ? { mob: "menu" as const } : {}),
    }));
  };

  const pickLocation = (row: SuggestionRow) =>
    update((current) => ({
      q: {
        ...current.q,
        loc: row.kind === "cur" ? "Current location" : row.label,
      },
      whereText: null,
      whereTyped: false,
      whereOpen: false,
      whereIdx: -1,
      ...(current.mob ? { mob: "menu" as const } : {}),
    }));

  const getKeyHandler =
    (
      field: "what" | "where",
      flat: SuggestionRow[],
      pick: (row: SuggestionRow) => void,
      fallback: () => void,
    ) =>
    (event: KeyboardEvent<HTMLInputElement>) => {
      const indexKey = field === "what" ? "whatIdx" : "whereIdx";
      const count = flat.length;
      const current = stateRef.current[indexKey];
      if (event.key === "ArrowDown") {
        event.preventDefault();
        update({
          [indexKey]: count ? (current + 1) % count : -1,
          [field + "Open"]: true,
        });
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        update({
          [indexKey]: count ? (current <= 0 ? count - 1 : current - 1) : -1,
        });
      } else if (event.key === "Enter") {
        event.preventDefault();
        const row = current >= 0 ? flat[current] : undefined;
        if (row) pick(row);
        else fallback();
      } else if (event.key === "Escape") {
        event.preventDefault();
        const target = event.currentTarget;
        update((state) => ({
          [field + "Open"]: false,
          [field + "Text"]: null,
          [field + "Typed"]: false,
          [indexKey]: -1,
          ...(state.mob ? { mob: "menu" as const } : {}),
        }));
        if (!stateRef.current.mob) target.blur();
      }
    };

  const closeSheet = (
    closingKey: "mobClosing" | "fClosing",
    finished: Partial<SearchState>,
    extra: Partial<SearchState> = {},
  ) => {
    update({ [closingKey]: true, ...extra });
    later(() => update(finished), SHEET_CLOSE_MS);
  };

  const filterDraft = state.fDraft || DEFAULT_DRAFT;
  const setFilterDraft = (patch: Partial<FilterDraft>) =>
    update((current) => ({
      fDraft: { ...(current.fDraft || DEFAULT_DRAFT), ...patch },
    }));
  const clearDate = () =>
    update((current) => ({
      q: { ...current.q, date: "" },
      day: "",
      time: "any",
      draft: "any",
    }));

  const actions = {
    closeDropdowns: () => update(CLOSE_ALL),
    closeMobileSheet: () =>
      closeSheet("mobClosing", { mob: "", mobClosing: false }, CLOSE_ALL),
    mobileToMenu: () => update({ mob: "menu", ...CLOSE_ALL }),
    openMobileSheet: () => update({ mob: "menu" }),
    openMobileWhat: () =>
      update({
        mob: "service",
        whatText: selection.display,
        whatTyped: false,
        whatIdx: -1,
        whatOpen: true,
      }),
    openMobileWhere: () =>
      update({
        mob: "location",
        whereText: "",
        whereTyped: false,
        whereIdx: -1,
        whereOpen: true,
      }),
    openMobileDate: () => update({ mob: "date" }),
    clearStyle: () =>
      update((current) => ({
        q: { ...current.q, group: "", type: "", qq: "" },
        whatText: null,
        whatTyped: false,
      })),
    clearArea: () =>
      update((current) => ({
        q: { ...current.q, loc: "Current location" },
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
        whatIdx: -1,
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
        whatIdx: -1,
      }),
    keyWhat: getKeyHandler("what", what.flat, pickWhat, () => {
      if (what.raw) pickWhat({ kind: "all-results", label: "", raw: what.raw });
    }),
    clearWhat: () => {
      update((current) => ({
        q: { ...current.q, group: "", type: "", qq: "" },
        whatText: "",
        whatTyped: false,
        whatOpen: true,
        whatIdx: -1,
      }));
      focusLater(isMobileSheet ? refs.whatMobile : refs.what);
    },
    pickWhatChip: (chip: WhatChip) => {
      update({ whatChip: chip, whatIdx: -1 });
      focusLater(isMobileSheet ? refs.whatMobile : refs.what);
    },
    hoverWhat: (index: number) => {
      if (stateRef.current.whatIdx !== index) update({ whatIdx: index });
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
        whereIdx: -1,
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
        whereIdx: -1,
      }),
    keyWhere: getKeyHandler("where", where.flat, pickLocation, () => {
      const firstLocation = where.locationRows[0];
      if (where.raw && firstLocation) pickLocation(firstLocation);
    }),
    clearWhere: () => {
      update((current) => ({
        q: { ...current.q, loc: "Current location" },
        whereText: "",
        whereTyped: false,
        whereOpen: true,
        whereIdx: -1,
      }));
      focusLater(isMobileSheet ? refs.whereMobile : refs.where);
    },
    hoverWhere: (index: number) => {
      if (stateRef.current.whereIdx !== index) update({ whereIdx: index });
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
      update({ calM: new Date(month.getFullYear(), month.getMonth() - 1, 1) }),
    nextMonth: (month: Date) =>
      update({ calM: new Date(month.getFullYear(), month.getMonth() + 1, 1) }),
    pickDay: (value: string) =>
      update((current) => ({
        q: { ...current.q, date: value },
        day: value,
        dateOpen: false,
      })),
    pickTime: (id: string) => update({ draft: id, time: id }),
    changeFrom: (event: ChangeEvent<HTMLSelectElement>) =>
      update({ cFrom: event.target.value }),
    changeTo: (event: ChangeEvent<HTMLSelectElement>) =>
      update({ cTo: event.target.value }),
    // Filters
    setVenues: (venues: Venue[]) => update({ venues }),
    togglePrice: () =>
      update((current) => ({
        priceOpen: !current.priceOpen,
        sortOpen: false,
        distOpen: false,
      })),
    closePrice: () => update({ priceOpen: false }),
    setMaxPrice: (maxPrice: number | null) => update({ maxPrice }),
    toggleSort: () =>
      update((current) => ({ sortOpen: !current.sortOpen, priceOpen: false })),
    closeSort: () => update({ sortOpen: false }),
    pickSort: (sort: SortKey) => update({ sort, sortOpen: false }),
    toggleDistance: () =>
      update((current) => ({
        distOpen: !current.distOpen,
        priceOpen: false,
        sortOpen: false,
      })),
    closeDistance: () => update({ distOpen: false }),
    pickDistance: (radius: number) => update({ radius, distOpen: false }),
    clearAll: () =>
      update({
        q: { group: "", type: "", qq: "", date: "", loc: "Current location" },
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
        fOpen: true,
        fClosing: false,
        fDraft: {
          venues: current.venues.slice(),
          maxPrice: current.maxPrice,
          radius: current.radius,
          sort: current.sort,
        },
      })),
    closeFilters: () =>
      closeSheet("fClosing", { fOpen: false, fClosing: false, fDraft: null }),
    setFilterDraft,
    clearFilterDraft: () =>
      update((current) => ({
        fDraft: { venues: [], maxPrice: null, radius: 10, sort: current.sort },
      })),
    applyFilters: () => {
      update({
        venues: filterDraft.venues,
        maxPrice: filterDraft.maxPrice,
        radius: filterDraft.radius || 10,
      });
      closeSheet("fClosing", { fOpen: false, fClosing: false, fDraft: null });
    },
  };

  // empty-state suggestions (prototype renderVals sugg)
  const nextRadius = RADII.find((radius) => radius > state.radius);
  const suggestions = [
    ...(state.q.date || state.time !== "any"
      ? [{ key: "d", label: "Try any date", pick: clearDate }]
      : []),
    ...(nextRadius
      ? [
          {
            key: "r",
            label: "Widen to " + nextRadius + " miles",
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
    ...(selection.ty && selection.gr
      ? [
          {
            key: "g",
            label: "Try " + selection.gr.name,
            pick: () =>
              update((current) => ({
                q: { ...current.q, type: "", group: selection.gr?.slug ?? "" },
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
    draftCount: state.fOpen ? calcResults(state, filterDraft).list.length : 0,
    filterDraft,
    suggestions,
    actions,
  };
};

export type SearchController = ReturnType<typeof useSearch>;
