import { onStudioWrite } from "../lib/studio-writes";
import { api } from "./api-slice";
import type { AppStore } from "./store";

/** A Studio save changes what profiles and search show, so their cached copies are dropped. */
export const startCacheListener = ({ dispatch }: AppStore) =>
  onStudioWrite(() => {
    dispatch(api.util.invalidateTags(["StylistProfile", "Search"]));
  });
