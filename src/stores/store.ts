import { configureStore } from "@reduxjs/toolkit";
import { api } from "./api-slice";
import { favouritesSlice, readFavourites } from "./favourites-slice";
import { sessionSlice } from "./session-slice";
import { toastSlice } from "./toast-slice";

export const createStore = () =>
  configureStore({
    reducer: {
      session: sessionSlice.reducer,
      favourites: favouritesSlice.reducer,
      toast: toastSlice.reducer,
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefault) => getDefault().concat(api.middleware),
    preloadedState: {
      favourites: {
        ...readFavourites(null),
        ownerId: null,
        loginSheetFor: null,
      },
    },
  });

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
