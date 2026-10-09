import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { createStore } from "../stores/store";

/** Shows the current router location so tests can assert navigation. */
const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{pathname + search}</div>;
};

/**
 * Renders inside a fresh store and a router at `url`. The shared helpers read window.location
 * (like the prototype), so the window URL is set to match before the store is created.
 */
export const renderWithStore = (ui: ReactElement, url = "/") => {
  window.history.replaceState(null, "", url);
  const store = createStore();
  const result = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </Provider>,
  );
  return { ...result, store };
};
