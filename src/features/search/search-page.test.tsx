import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../test/render-with-store";
import { SearchPage } from "./search-page";

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

  it("typing in What opens matching styles and stylists; picking a group filters the results", () => {
    renderWithStore(<SearchPage />, "/search");
    const input = screen.getByRole("combobox", { name: "Style or stylist" });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "loc" } });
    const list = screen.getByRole("listbox", { name: "Styles and stylists" });

    fireEvent.click(within(list).getByRole("option", { name: /^Locs/ }));

    expect(screen.getAllByRole("status")[0]).toHaveTextContent(
      "1 stylist for Locs near you",
    );
  });

  it("shows the empty state with suggestions and Clear filters", () => {
    renderWithStore(<SearchPage />, "/search?maxPrice=5");
    expect(screen.getByText("No stylists match that yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove price limit" }));

    expect(
      screen.queryByText("No stylists match that yet"),
    ).not.toBeInTheDocument();
  });

  it("the filters sheet edits a draft and applies it", () => {
    renderWithStore(<SearchPage />, "/search");
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    const sheet = screen.getByRole("dialog", { name: "Filters" });

    fireEvent.click(within(sheet).getByRole("button", { name: "Mobile" }));

    fireEvent.click(
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

  it("sort and distance pick from their popovers", () => {
    renderWithStore(<SearchPage />, "/search");
    fireEvent.click(screen.getByRole("button", { name: "Sort: Distance" }));

    expect(
      screen.queryByRole("option", { name: "Lowest price" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "Price: high to low" }));

    expect(
      screen.getByRole("button", { name: "Sort: Price: high to low" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Sort: Price: high to low" }),
    );

    fireEvent.click(screen.getByRole("option", { name: "Price: low to high" }));

    expect(
      screen.getByRole("button", { name: "Sort: Price: low to high" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Within 10 miles" }));
    fireEvent.click(screen.getByRole("option", { name: "Within 25 miles" }));

    expect(
      screen.getByRole("button", { name: "Within 25 miles" }),
    ).toBeInTheDocument();
  });

  it("the When popover sets a time of day", () => {
    renderWithStore(<SearchPage />, "/search");
    fireEvent.click(screen.getByRole("button", { name: "Any date" }));
    fireEvent.click(screen.getByRole("button", { name: /^Morning/ }));

    expect(
      screen.getByRole("button", { name: "Any date · Morning" }),
    ).toBeInTheDocument();
  });

  it("the ☰ button opens a menu with site links and Log in when logged out", () => {
    renderWithStore(<SearchPage />, "/search");
    const button = screen.getByRole("button", { name: "Menu" });

    fireEvent.click(button);
    const menu = screen.getByRole("menu", { name: "Menu" });

    expect(button).toHaveAttribute("aria-expanded", "true");

    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Find a stylist", "Services", "Log in", "Help & support"]);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      screen.queryByRole("menu", { name: "Menu" }),
    ).not.toBeInTheDocument();
  });

  it("logged in, the menu lists the account links and logs out", () => {
    sessionStorage.setItem("tw_cust", "1");
    renderWithStore(<SearchPage />, "/search");
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const menu = screen.getByRole("menu", { name: "Menu" });

    expect(within(menu).getByText("Account")).toBeInTheDocument();

    expect(
      within(menu).getByRole("menuitem", { name: "Bookings" }),
    ).toHaveAttribute("href", "/account?section=bookings");

    fireEvent.click(within(menu).getByRole("menuitem", { name: "Log out" }));
    expect(sessionStorage.getItem("tw_cust")).toBeNull();
  });
});
