import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { SearchPage } from "../search-page";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

describe("SearchPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => vi.useRealTimers());

  it("lists stylists near the current location", () => {
    renderWithStore(<SearchPage />, "/search");

    expect(screen.getAllByRole("status")[0]).toHaveTextContent(
      /\d+ stylists near you/,
    );

    expect(
      screen.getAllByRole("link", { name: "NaturallyNia" })[0],
    ).toHaveAttribute("href", "/stylist?stylist=naturallynia");
  });

  it("typing in What opens matching styles and stylists; picking a group filters the results", async () => {
    renderWithStore(<SearchPage />, "/search");
    const input = screen.getByRole("combobox", { name: "Style or stylist" });

    await user.type(input, "loc");
    const list = screen.getByRole("listbox", { name: "Styles and stylists" });

    await user.click(within(list).getByRole("option", { name: /^Locs/ }));

    expect(screen.getAllByRole("status")[0]).toHaveTextContent(
      "1 stylist for Locs near you",
    );
  });

  it("shows the empty state with suggestions and Clear filters", async () => {
    renderWithStore(<SearchPage />, "/search?maxPrice=5");
    expect(screen.getByText("No stylists match that yet")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Remove price limit" }),
    );

    expect(
      screen.queryByText("No stylists match that yet"),
    ).not.toBeInTheDocument();
  });

  it("the filters sheet edits a draft and applies it", async () => {
    renderWithStore(<SearchPage />, "/search");
    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    const sheet = screen.getByRole("dialog", { name: "Filters" });

    await user.click(within(sheet).getByRole("button", { name: "Mobile" }));

    await user.click(
      within(sheet).getByRole("button", { name: /^Show \d+ stylists?$/ }),
    );

    act(() => vi.advanceTimersByTime(330));

    expect(
      screen.queryByRole("dialog", { name: "Filters" }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Filters · 1" }),
    ).toBeInTheDocument();
  });

  it("sort and distance pick from their popovers", async () => {
    renderWithStore(<SearchPage />, "/search");
    await user.click(screen.getByRole("button", { name: "Sort: Distance" }));

    expect(
      screen.queryByRole("option", { name: "Lowest price" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("option", { name: "Price: high to low" }),
    );

    expect(
      screen.getByRole("button", { name: "Sort: Price: high to low" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Sort: Price: high to low" }),
    );

    await user.click(
      screen.getByRole("option", { name: "Price: low to high" }),
    );

    expect(
      screen.getByRole("button", { name: "Sort: Price: low to high" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Within 10 miles" }));
    await user.click(screen.getByRole("option", { name: "Within 25 miles" }));

    expect(
      screen.getByRole("button", { name: "Within 25 miles" }),
    ).toBeInTheDocument();
  });

  it("the When popover sets a time of day", async () => {
    renderWithStore(<SearchPage />, "/search");
    await user.click(screen.getByRole("button", { name: "Any date" }));
    await user.click(screen.getByRole("button", { name: /^Morning/ }));

    expect(
      screen.getByRole("button", { name: "Any date · Morning" }),
    ).toBeInTheDocument();
  });

  it("the ☰ button opens a menu with site links and Log in when logged out", async () => {
    renderWithStore(<SearchPage />, "/search");
    const button = screen.getByRole("button", { name: "Menu" });

    await user.click(button);
    const menu = screen.getByRole("menu", { name: "Menu" });

    expect(button).toHaveAttribute("aria-expanded", "true");

    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Find a stylist",
      "Services",
      "About",
      "For stylists",
      "Log in",
      "Help & support",
    ]);

    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("menu", { name: "Menu" }),
    ).not.toBeInTheDocument();
  });

  it("logged in, the account button replaces ☰ and its menu lists the account links and logs out", async () => {
    const { store } = renderWithStore(<SearchPage />, "/search", {
      signedIn: true,
    });

    expect(
      screen.queryByRole("button", { name: "Menu" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Account" }));
    const menu = screen.getByRole("menu", { name: "Nia Okafor" });

    expect(menu).toHaveTextContent("nia.okafor@gmail.com");

    expect(
      within(menu).getByRole("menuitem", { name: "Bookings" }),
    ).toHaveAttribute("href", "/account?section=bookings");

    await user.click(within(menu).getByRole("menuitem", { name: "Log out" }));
    expect(store.getState().session.loggedIn).toBe(false);
  });
});
