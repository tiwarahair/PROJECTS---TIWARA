import { configureStore } from "@reduxjs/toolkit";
import { api } from "./api-slice";
import { favouritesSlice } from "./favourites-slice";
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
  });

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
