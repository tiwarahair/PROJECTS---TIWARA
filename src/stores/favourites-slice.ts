import { createSlice } from "@reduxjs/toolkit";
import type { Dispatch, PayloadAction } from "@reduxjs/toolkit";
import { fetchFavourites, writeFavourite } from "../lib/favourites";
import { sessionChanged } from "./session-slice";
import { showToast } from "./toast-slice";

interface FavouritesState {
  ids: string[];
  isLoaded: boolean;
  isFailed: boolean;
  ownerId: string | null;
  loginSheetFor: string | null;
}

const initialState: FavouritesState = {
  ids: [],
  isLoaded: false,
  isFailed: false,
  ownerId: null,
  loginSheetFor: null,
};

export const favouritesSlice = createSlice({
  name: "favourites",
  initialState,
  reducers: {
    favouritesRequested: (state) => {
      state.isFailed = false;
    },
    favouritesFailed: (state, { payload: ownerId }: PayloadAction<string>) => {
      if (state.ownerId === ownerId && !state.isLoaded) state.isFailed = true;
    },
    favouritesLoaded: (
      state,
      {
        payload: { ownerId, ids },
      }: PayloadAction<{ ownerId: string; ids: string[] }>,
    ) => {
      if (state.ownerId !== ownerId) return;

      state.ids = ids;
      state.isLoaded = true;
    },
    setFavourite: (
      state,
      { payload: { id, on } }: PayloadAction<{ id: string; on: boolean }>,
    ) => {
      const ids = state.ids.filter((existing) => existing !== id);

      if (on) ids.unshift(id);

      state.ids = ids;
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
      const ownerId = payload?.id ?? null;

      if (ownerId === state.ownerId) return;

      state.ownerId = ownerId;
      state.ids = [];
      state.isLoaded = false;
      state.isFailed = false;
    }),
});

export const { setFavourite, openLoginSheet, closeLoginSheet } =
  favouritesSlice.actions;

const { favouritesRequested, favouritesFailed, favouritesLoaded } =
  favouritesSlice.actions;

// load the account's favourites
export const loadFavourites =
  (ownerId: string) =>
  async (
    dispatch: Dispatch,
    getState: () => { favourites: FavouritesState },
  ) => {
    const startIds = getState().favourites.ids;

    dispatch(favouritesRequested());

    try {
      const savedIds = await fetchFavourites();
      // hearts tapped while loading win over the list read before they were saved
      const currentIds = getState().favourites.ids;
      const added = currentIds.filter((id) => !startIds.includes(id));
      const removed = startIds.filter((id) => !currentIds.includes(id));

      const ids = [
        ...added,
        ...savedIds.filter(
          (id) => !added.includes(id) && !removed.includes(id),
        ),
      ];

      dispatch(favouritesLoaded({ ownerId, ids }));
    } catch {
      // a list already shown stays as it is; with none yet, the page offers to try again
      dispatch(favouritesFailed(ownerId));
    }
  };

// each heart's saves wait for the one before, so quick taps reach the server in order
const savesInFlight = new Map<string, Promise<void>>();

/** Shows the change straight away, then turns the heart back if it can't be saved. */
export const saveFavourite =
  ({ id, on }: { id: string; on: boolean }) =>
  (dispatch: Dispatch) => {
    dispatch(setFavourite({ id, on }));

    const save = (savesInFlight.get(id) ?? Promise.resolve())
      .then(() => writeFavourite(id, on))
      .catch(() => {
        dispatch(setFavourite({ id, on: !on }));
        dispatch(showToast("Your favourites couldn’t be saved. Try again"));
      })
      .finally(() => {
        if (savesInFlight.get(id) === save) savesInFlight.delete(id);
      });

    savesInFlight.set(id, save);

    return save;
  };
