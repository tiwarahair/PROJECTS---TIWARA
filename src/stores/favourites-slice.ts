import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { sessionChanged } from "./session-slice";

// kept on the device per account until favourites move to the database (Phase 6)
const getStorageKey = (ownerId: string) => `tw_favs_${ownerId}`;

export const clearStoredFavourites = (ownerId: string) => {
  try {
    window.localStorage.removeItem(getStorageKey(ownerId));
  } catch {
    // storage unavailable: nothing to clear
  }
};

interface FavouritesState {
  ids: string[];
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

/** The logged-in account's saved favourites, else none. */
const readFavourites = (ownerId: string | null): string[] =>
  ownerId ? readStored(ownerId) : [];

const initialState: FavouritesState = {
  ids: [],
  ownerId: null,
  loginSheetFor: null,
};

export const favouritesSlice = createSlice({
  name: "favourites",
  initialState,
  reducers: {
    syncFavourites: (state) => {
      state.ids = readFavourites(state.ownerId);
    },
    setFavourite: (
      state,
      { payload: { id, on } }: PayloadAction<{ id: string; on: boolean }>,
    ) => {
      const ids = state.ids.filter((existing) => existing !== id);

      if (on) ids.unshift(id);

      state.ids = ids;

      if (state.ownerId)
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
      state.ids = readFavourites(state.ownerId);
    }),
});

export const { syncFavourites, setFavourite, openLoginSheet, closeLoginSheet } =
  favouritesSlice.actions;
