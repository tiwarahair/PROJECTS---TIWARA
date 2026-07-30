import { configureStore } from "@reduxjs/toolkit";
import { overlaysReducer } from "./overlays-slice";

export function createStore() {
  return configureStore({
    reducer: { overlays: overlaysReducer },
  });
}

export const store = createStore();

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
