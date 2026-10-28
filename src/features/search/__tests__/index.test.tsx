import { act, screen, within } from "@testing-library/react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCatalogue } from "../../../lib/catalogue";
import { TEST_CATALOGUE } from "../../../test/catalogue";
import type { Catalogue } from "../../../types/catalogue";
import { searchStylists } from "../../../lib/search-api";
import { renderWithStore } from "../../../test/render-with-store";
import { fakeSearch } from "../../../test/search-rows";
import { SearchPage } from "..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

vi.mock("../../../lib/search-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/search-api")>()),
  searchStylists: vi.fn(),
}));

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
  vi.mocked(searchStylists).mockReset().mockImplementation(fakeSearch);
});

describe("SearchPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("holds the chosen style's place until the catalogue can name it", async () => {
    let finish: (catalogue: Catalogue) => void = () => undefined;

    vi.mocked(fetchCatalogue).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );

    renderWithStore(<SearchPage />, "/search?type=silk-press", {
      isCatalogueLoading: true,
    });

    const what = screen.getByRole("combobox", { name: "Style or stylist" });

    expect(what).toHaveValue("");
    expect(what).not.toHaveAttribute("placeholder", "All styles");
    expect(screen.getByTestId("what-skeleton")).toBeInTheDocument();

    await act(async () => finish(TEST_CATALOGUE));

    await vi.waitFor(() => expect(what).toHaveValue("Silk press"));

    expect(screen.queryByTestId("what-skeleton")).toBeNull();
  });

  it("stops loading, without searching, when the catalogue fails", async () => {
    vi.mocked(fetchCatalogue).mockRejectedValueOnce(new Error("offline"));

    renderWithStore(<SearchPage />, "/search?type=silk-press", {
      isCatalogueLoading: true,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(screen.queryAllByTestId("stylist-card-skeleton")).toHaveLength(0);

    expect(searchStylists).not.toHaveBeenCalled();
    expect(screen.queryByText("No stylists match that yet")).toBeNull();
  });

  it("loads Google's places only once Where is opened", async () => {
    vi.mocked(useMapsLibrary).mockClear();
    renderWithStore(<SearchPage />, "/search");

    await screen.findAllByRole("link", { name: "NaturallyNia" });

    expect(useMapsLibrary).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("combobox", { name: "Area or postcode" }),
    );

    expect(useMapsLibrary).toHaveBeenCalledWith("places");
  });

  it("without a location it lists every stylist and offers to use the location", async () => {
    renderWithStore(<SearchPage />, "/search");

    expect(
      (await screen.findAllByRole("link", { name: "NaturallyNia" }))[0],
    ).toHaveAttribute("href", "/naturallynia");

    const count = screen.getAllByRole("status")[0];

    expect(count).toHaveTextContent("2 stylists");
    expect(count).not.toHaveTextContent("near");
  });

  it("asks for the location as soon as Search opens and sorts by distance", async () => {
    const getCurrentPosition = vi.fn((found: PositionCallback) =>
      found({
        coords: { latitude: 53.48, longitude: -2.24 },
      } as GeolocationPosition),
    );

    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: { getCurrentPosition },
    });

    renderWithStore(<SearchPage />, "/search");

    expect(await screen.findAllByText("2 stylists near you")).not.toHaveLength(
      0,
    );

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);

    expect(searchStylists).toHaveBeenLastCalledWith(
      expect.objectContaining({ lat: 53.48, lng: -2.24 }),
      0,
    );
  });

  it("a typed area searches around its point", async () => {
    renderWithStore(<SearchPage />, "/search?loc=Chorlton&ll=53.44,-2.27");

    await screen.findAllByRole("link", { name: "NaturallyNia" });

    expect(searchStylists).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 53.44, lng: -2.27, radius_miles: 10 }),
      0,
    );

    expect(screen.getAllByRole("status")[0]).toHaveTextContent(
      "2 stylists near Chorlton",
    );
  });

  it("typing in What opens matching styles and stylists; picking a group filters the results", async () => {
    renderWithStore(<SearchPage />, "/search");
    const input = screen.getByRole("combobox", { name: "Style or stylist" });

    await user.type(input, "loc");
    const list = screen.getByRole("listbox", { name: "Styles and stylists" });

    await user.click(within(list).getByRole("option", { name: /^Locs/ }));

    expect(await screen.findByText("1 stylist for Locs")).toBeInTheDocument();
  });

  it("shows the empty state with suggestions and Clear filters", async () => {
    renderWithStore(<SearchPage />, "/search?maxPrice=5");

    expect(
      await screen.findByText("No stylists match that yet"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Remove price limit" }),
    );

    await screen.findAllByRole("link", { name: "NaturallyNia" });

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
