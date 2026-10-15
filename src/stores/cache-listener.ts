import { onStudioWrite } from "../lib/studio-writes";
import { api } from "./api-slice";
import type { AppDispatch, AppStore } from "./store";

let openStudios = 0;
let isStudioCacheStale = false;

const dropStudioCache = (dispatch: AppDispatch) =>
  dispatch(api.util.invalidateTags(["Studio", "TwoFactor"]));

/**
 * A Studio save changes what profiles and search show, so their cached copies are dropped. Studio's own copy is
 * dropped too, but only once Studio has closed: while open its state is the truth, and refetching would be wasted.
 */
export const startCacheListener = ({ dispatch }: AppStore) =>
  onStudioWrite(() => {
    dispatch(api.util.invalidateTags(["StylistProfile", "Search"]));

    if (openStudios) isStudioCacheStale = true;
    else dropStudioCache(dispatch);
  });

/** Call when Studio opens; the returned function, when it closes. Saves that land after closing drop the cache at once. */
export const trackOpenStudio = (dispatch: AppDispatch) => {
  openStudios++;

  return () => {
    openStudios--;

    if (openStudios || !isStudioCacheStale) return;

    isStudioCacheStale = false;
    dropStudioCache(dispatch);
  };
};
