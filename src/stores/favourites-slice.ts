import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { getSearchParams } from "../utils/page-flags";
import { DEMO_ACCOUNT, readDemoLogin } from "./session-slice";

const STORAGE_KEY = `tw_favs_${DEMO_ACCOUNT.email}`;

interface FavouritesState {
  ids: string[];
  /** ?favs=a,b keeps favourites in memory only (boards). */
  inMemory: boolean;
  /** Guest tapped a heart: the "Log in to save stylists" sheet is open for this stylist. */
  loginSheetFor: string | null;
}

const readStored = (): string[] => {
  try {
    return JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) || "[]",
    ) as string[];
  } catch {
    return [];
  }
};

/** Favourites for the current page: ?favs= list, else the logged-in account's saved list, else none. */
export const readFavourites = (): Pick<FavouritesState, "ids" | "inMemory"> => {
  const params = getSearchParams();
  const favouritesParam = params.get("favs");

  if (params.has("favs"))
    return {
      ids: (favouritesParam ?? "").split(",").filter(Boolean),
      inMemory: true,
    };

  return { ids: readDemoLogin() ? readStored() : [], inMemory: false };
};

const initialState: FavouritesState = {
  ids: [],
  inMemory: false,
  loginSheetFor: null,
};

export const favouritesSlice = createSlice({
  name: "favourites",
  initialState,
  reducers: {
    syncFavourites: (state) => {
      Object.assign(state, readFavourites());
    },
    setFavourite: (
      state,
      { payload: { id, on } }: PayloadAction<{ id: string; on: boolean }>,
    ) => {
      const ids = state.ids.filter((existing) => existing !== id);

      if (on) ids.unshift(id);

      state.ids = ids;

      if (!state.inMemory)
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        } catch {
          // storage unavailable
        }
    },
    openLoginSheet: (state, { payload }: PayloadAction<string>) => {
      state.loginSheetFor = payload;
    },
    closeLoginSheet: (state) => {
      state.loginSheetFor = null;
    },
  },
});

export const { syncFavourites, setFavourite, openLoginSheet, closeLoginSheet } =
  favouritesSlice.actions;
