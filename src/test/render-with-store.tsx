import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { RouterProvider, createMemoryRouter, useLocation } from "react-router";
import { api } from "../stores/api-slice";
import { sessionChanged } from "../stores/session-slice";
import { createStore } from "../stores/store";
import type { Profile } from "../types/profile";
import type { SessionUser } from "../types/session";

export const TEST_USER: SessionUser = {
  id: "test-user",
  email: "nia.okafor@gmail.com",
  isStylist: false,
  isAdmin: false,
  providers: ["email", "google"],
  createdAt: "2024-03-12T10:00:00Z",
};

export const TEST_PROFILE: Profile = {
  first: "Nia",
  last: "Okafor",
  mobile: "7700 900412",
  marketing: false,
};

interface RenderOptions {
  /** Signs in TEST_USER with TEST_PROFILE already loaded. */
  signedIn?: boolean;
}

/** Shows the current router location so tests can assert navigation. */
const LocationProbe = () => {
  const { pathname, search } = useLocation();

  return <div data-testid="location">{pathname + search}</div>;
};

/**
 * Renders inside a fresh store and a router at `url`. The shared helpers read window.location,
 * so the window URL is set to match before the store is created.
 */
export const renderWithStore = (
  ui: ReactElement,
  url = "/",
  { signedIn = false }: RenderOptions = {},
) => {
  window.history.replaceState(null, "", url);
  const store = createStore();

  if (signedIn) {
    store.dispatch(sessionChanged(TEST_USER));

    store.dispatch(
      api.util.upsertQueryEntries([
        { endpointName: "getProfile", arg: TEST_USER.id, value: TEST_PROFILE },
      ]),
    );
  }

  // a data router, so pages can use useBlocker
  const router = createMemoryRouter(
    [
      {
        path: "*",
        element: (
          <>
            {ui}
            <LocationProbe />
          </>
        ),
      },
    ],
    { initialEntries: [url] },
  );

  const result = render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );

  return { ...result, store };
};
