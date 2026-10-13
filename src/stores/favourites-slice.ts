import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { getSearchParams } from "../utils/page-flags";
import { sessionChanged } from "./session-slice";

// kept on the device per account until favourites move to the database (Phase 6)
const getStorageKey = (ownerId: string) => `tw_favs_${ownerId}`;

interface FavouritesState {
  ids: string[];
  /** ?favs=a,b keeps favourites in memory only (boards). */
  inMemory: boolean;
  /** The signed-in account the saved list belongs to. */
  ownerId: string | null;
  /** Guest tapped a heart: the "Log in to save stylists" sheet is open for this stylist. */
  loginSheetFor: string | null;
}

const readStored = (ownerId: string): string[] => {
  try {
    return JSON.parse(
      window.localStorage.getItem(getStorageKey(ownerId)) || "[]",
    ) as string[];
  } catch {
    return [];
  }
};

/** Favourites for the current page: ?favs= list, else the logged-in account's saved list, else none. */
export const readFavourites = (
  ownerId: string | null,
): Pick<FavouritesState, "ids" | "inMemory"> => {
  const params = getSearchParams();
  const favouritesParam = params.get("favs");

  if (params.has("favs"))
    return {
      ids: (favouritesParam ?? "").split(",").filter(Boolean),
      inMemory: true,
    };

  return { ids: ownerId ? readStored(ownerId) : [], inMemory: false };
};

const initialState: FavouritesState = {
  ids: [],
  inMemory: false,
  ownerId: null,
  loginSheetFor: null,
};

export const favouritesSlice = createSlice({
  name: "favourites",
  initialState,
  reducers: {
    syncFavourites: (state) => {
      Object.assign(state, readFavourites(state.ownerId));
    },
    setFavourite: (
      state,
      { payload: { id, on } }: PayloadAction<{ id: string; on: boolean }>,
    ) => {
      const ids = state.ids.filter((existing) => existing !== id);

      if (on) ids.unshift(id);

      state.ids = ids;

      if (!state.inMemory && state.ownerId)
        try {
          window.localStorage.setItem(
            getStorageKey(state.ownerId),
            JSON.stringify(ids),
          );
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
  extraReducers: (builder) =>
    builder.addCase(sessionChanged, (state, { payload }) => {
      state.ownerId = payload?.id ?? null;
      Object.assign(state, readFavourites(state.ownerId));
    }),
});

export const { syncFavourites, setFavourite, openLoginSheet, closeLoginSheet } =
  favouritesSlice.actions;
