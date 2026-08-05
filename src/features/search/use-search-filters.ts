import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import type { ServiceId } from "../../types/services";

const DEBOUNCE_MS = 300;

export interface SearchFilters {
  style: ServiceId | "";
  location: string;
  setStyle: (style: ServiceId | "") => void;
  setLocation: (location: string) => void;
}

// TO DO: READ

/**
 * Search filters live in the query string so `/search?style=braids` is
 * shareable and so returning from a profile restores the same results.
 *
 * Both writes use `replace`, treating a filter change as refining one search
 * rather than a new destination — otherwise Back would step backwards through
 * every chip press instead of leaving search.
 *
 * @param frozenSearch when search is sitting behind another surface, the query
 * string it was opened with. The live URL points at the surface on top by
 * then, so reading it would reset the results the user can still see.
 */
export function useSearchFilters(frozenSearch?: string): SearchFilters {
  const [params, setParams] = useSearchParams();
  const frozen = frozenSearch !== undefined;
  const source = frozen ? new URLSearchParams(frozenSearch) : params;

  const style = (source.get("style") ?? "") as ServiceId | "";
  const locationParam = source.get("location") ?? "";

  // Results filter on this immediately; only the URL waits for the debounce.
  const [location, setLocation] = useState(locationParam);

  // Adopt changes that came from navigation rather than from typing here.
  useEffect(() => {
    setLocation(locationParam);
  }, [locationParam]);

  const write = useCallback(
    (key: string, value: string) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // Debounced so a typed city is one history entry, not one per keystroke.
  useEffect(() => {
    if (frozen || location === locationParam) return;
    const timer = setTimeout(() => write("location", location), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [frozen, location, locationParam, write]);

  const setStyle = useCallback(
    (next: ServiceId | "") => {
      if (!frozen) write("style", next);
    },
    [frozen, write],
  );

  return { style, location, setStyle, setLocation };
}
