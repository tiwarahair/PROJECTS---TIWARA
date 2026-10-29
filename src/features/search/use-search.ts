// Search's state (kept in the URL), its data and its actions.
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useViewportWidth } from "../../hooks/use-viewport-width";
import { getEmptySuggestions } from "./empty-suggestions";
import { createFieldActions } from "./field-actions";
import { createFilterActions } from "./filter-actions";
import { getInitialState, getStateSearch } from "./state";
import type { SearchState } from "./state";
import { getWhatModel, getWhereModel } from "./suggestions";
import { CLOSE_ALL, DEFAULT_DRAFT } from "./update";
import type { Update } from "./update";
import { useSearchData } from "./use-search-data";
import { NO_PLACES } from "./use-place-suggestions";

const SHEET_CLOSE_MS = 330;

export const useSearch = () => {
  const navigate = useNavigate();
  const { search: locationSearch } = useLocation();
  const viewportWidth = useViewportWidth();

  // read once: the state drives the URL from here on (the sync below), not the other way round
  const [state, setState] = useState<SearchState>(() =>
    getInitialState(locationSearch, window.innerWidth),
  );

  // the sync below compares against the current URL without re-running when only the URL changes
  const locationSearchRef = useRef(locationSearch);

  locationSearchRef.current = locationSearch;

  const update: Update = useCallback(
    (patch) =>
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

    const timers = timersRef.current;

    return () => {
      window.clearTimeout(timer);
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

  const filterDraft = state.filtersDraft || DEFAULT_DRAFT;

  // Google Maps loads once Where is first opened (PlacesBridge), not on every visit
  const [places, setPlaces] = useState(NO_PLACES);
  const [isPlacesWanted, setIsPlacesWanted] = useState(false);

  if (!isPlacesWanted && state.whereOpen) setIsPlacesWanted(true);

  const data = useSearchData(state, filterDraft, places);
  const { selection, place } = data;
  const what = getWhatModel(state, selection, data.stylistSuggestions);

  const isLocationOff =
    place.current &&
    (data.location.status === "denied" ||
      data.location.status === "unavailable");

  const where = getWhereModel(state, place, data.places, isLocationOff);

  const hasDistance = place.current ? !isLocationOff : !!place.point;

  const closeSheet = (
    closingKey: "mobileClosing" | "filtersClosing",
    finished: Partial<SearchState>,
    extra: Partial<SearchState> = {},
  ) => {
    update({ [closingKey]: true, ...extra });
    later(() => update(finished), SHEET_CLOSE_MS);
  };

  const fieldActions = createFieldActions({
    update,
    getState: () => stateRef.current,
    navigate,
    focusField: (field) => {
      const isSheet = !!stateRef.current.mobileView;

      const inputs = {
        what: isSheet ? refs.whatMobile : refs.what,
        where: isSheet ? refs.whereMobile : refs.where,
      };

      window.setTimeout(() => inputs[field].current?.focus(), 0);
    },
    selection,
    what,
    where,
    resolvePlace: data.places.resolve,
  });

  const filterActions = createFilterActions(update, closeSheet, filterDraft);

  const actions = {
    ...fieldActions,
    ...filterActions,
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
  };

  return {
    ...data,
    placesBridge: isPlacesWanted
      ? {
          text: state.whereTyped ? (state.whereText ?? "") : "",
          onChange: setPlaces,
        }
      : null,
    state,
    refs,
    viewportWidth,
    what,
    where,
    hasDistance,
    filterDraft,
    suggestions: getEmptySuggestions(
      state,
      selection,
      update,
      filterActions.clearDate,
    ),
    actions,
  };
};

export type SearchController = ReturnType<typeof useSearch>;
