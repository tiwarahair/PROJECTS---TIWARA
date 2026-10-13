import { configureStore } from "@reduxjs/toolkit";
import { favouritesSlice, readFavourites } from "./favourites-slice";
import { readDemoLogin, sessionSlice } from "./session-slice";
import { toastSlice } from "./toast-slice";

export const createStore = () =>
  configureStore({
    reducer: {
      session: sessionSlice.reducer,
      favourites: favouritesSlice.reducer,
      toast: toastSlice.reducer,
    },
    preloadedState: {
      session: { loggedIn: readDemoLogin(), user: null, ready: false },
      favourites: { ...readFavourites(), loginSheetFor: null },
      toast: { current: null },
    },
  });

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
