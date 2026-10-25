import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStore } from "../../../stores/store";
import { renderWithStore } from "../../../test/render-with-store";
import { NotFoundPage } from "../not-found";
import { RouteError } from "../route-error";

const Broken = () => {
  throw new Error("broken");
};

const renderError = (url: string) => {
  const router = createMemoryRouter(
    [
      {
        errorElement: <RouteError />,
        children: [{ path: "/broken", element: <Broken /> }],
      },
    ],
    { initialEntries: [url] },
  );

  render(
    <Provider store={createStore()}>
      <RouterProvider router={router} />
    </Provider>,
  );
};

describe("page states", () => {
  afterEach(() => vi.restoreAllMocks());

  it("not found links home", () => {
    renderWithStore(<NotFoundPage />, "/a/b");

    expect(
      screen.getByRole("heading", { name: "We couldn’t find this page" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Go to Tiwára’s House" }),
    ).toHaveAttribute("href", "/");
  });

  it("a one-word address points to search", () => {
    renderWithStore(<NotFoundPage isStylistLink />, "/nobody");

    expect(
      screen.getByText(/If you’re looking for a stylist/),
    ).toBeInTheDocument();
  });

  it("a page that throws offers to try again at the same address", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderError("/broken?step=2");

    expect(
      screen.getByRole("heading", { name: "Something went wrong" }),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/broken?step=2",
    );
  });

  it("says you're offline when there's no connection", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderError("/broken");

    expect(
      screen.getByRole("heading", { name: "You’re offline" }),
    ).toBeInTheDocument();
  });

  it("an unmatched address shows not found", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderError("/missing");

    expect(
      screen.getByRole("heading", { name: "We couldn’t find this page" }),
    ).toBeInTheDocument();
  });
});
