import { configureStore } from "@reduxjs/toolkit";
import { modalsReducer } from "./modals-slice";

export function createStore() {
  return configureStore({
    reducer: { modals: modalsReducer },
  });
}

export const store = createStore();

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
