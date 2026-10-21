import { useEffect } from "react";
import { ADDRESS_TYPES } from "../../lib/google-maps";
import { MAX_RESULTS, SEARCH_DELAY_MS } from "./data";
import type { UseAddressFinderOptions } from "./data";
import { getBlank, hasAddress, toDraft, toSuggestion } from "./state";
import type { FinderCore } from "./use-finder-core";

export const useFinderEffects = (
  core: FinderCore,
  { value, autoFocus = false }: UseAddressFinderOptions,
) => {
  const {
    state,
    update,
    queryRef,
    emittingRef,
    clearBlurTimer,
    previousValueRef,
    places,
    sessionRef,
  } = core;

  useEffect(() => {
    let focusTimer = 0;

    if (autoFocus && state.mode === "find")
      focusTimer = window.setTimeout(() => queryRef.current?.focus(), 60);

    return () => {
      window.clearTimeout(focusTimer);
      clearBlurTimer();
    };
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // follow external value changes
  useEffect(() => {
    const previous = previousValueRef.current;

    previousValueRef.current = value;

    if (value === previous || emittingRef.current) return;

    if (value?.line1 && state.mode === "find") {
      const draft = toDraft(value);

      update({ mode: "summary", sum: draft, draft });
    } else if (
      !hasAddress(value) &&
      previous?.line1 &&
      state.mode === "summary"
    )
      update({ mode: "find", sum: null, draft: getBlank(), query: "" });
  }, [value, state.mode, update, previousValueRef, emittingRef]);

  // Google suggestions for the query, a moment after typing stops
  useEffect(() => {
    const input = state.query.trim();

    if (!places || state.mode !== "find" || input.length < 3) return;

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      sessionRef.current ??= new places.AutocompleteSessionToken();

      // Google unreachable: show "can't find", which offers manual entry
      const suggestions =
        await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionRef.current,
          includedRegionCodes: ["gb"],
          includedPrimaryTypes: ADDRESS_TYPES,
        })
          .then((result) => result.suggestions)
          .catch(() => []);

      if (cancelled) return;

      update({
        searchedQuery: input,
        hits: suggestions
          .flatMap(({ placePrediction }) =>
            placePrediction ? [toSuggestion(placePrediction)] : [],
          )
          .slice(0, MAX_RESULTS),
      });
    }, SEARCH_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [places, state.query, state.mode, update, sessionRef]);
};
