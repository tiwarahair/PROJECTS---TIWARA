import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeIntersectionObserver } from "../../../test/helpers";
import type { FakeIntersectionObserver } from "../../../test/helpers";
import { fetchCatalogue } from "../../../lib/catalogue";
import { searchStylists } from "../../../lib/search-api";
import { TEST_CATALOGUE } from "../../../test/catalogue";
import type { Catalogue } from "../../../types/catalogue";
import { renderWithStore } from "../../../test/render-with-store";
import { fakeSearch } from "../../../test/search-rows";
import { HomePage } from "..";
import type { HomePageProps } from "..";
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

let observer: FakeIntersectionObserver;

const renderHome = (props: HomePageProps = {}, url = "/", signedIn = false) =>
  renderWithStore(<HomePage {...props} />, url, { signedIn });

describe("HomePage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    observer = installFakeIntersectionObserver();

    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    window.scrollTo = vi.fn();
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    observer.restore();
    vi.useRealTimers();
  });

  it("renders every default section in order", () => {
    renderHome();

    const labels = [...document.querySelectorAll("[data-screen-label]")].map(
      (element) => element.getAttribute("data-screen-label"),
    );

    expect(labels).toEqual([
      "Home",
      "Nav",
      "Hero",
      "Styles marquee",
      "The problem",
      "Book a slot",
      "Stylists",
      "Six looks",
      "Hair quiz",
      "Meet Tiwára",
      "For stylists",
      "FAQ",
      "Footer",
    ]);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Your stylist is closer than you think.",
    );

    expect(document.documentElement).toHaveClass("home-page");
  });

  it("lists the newest live stylists with a link to their profile", async () => {
    renderHome();

    const [link] = await screen.findAllByRole("link", { name: "NaturallyNia" });

    expect(link).toHaveAttribute("href", "/naturallynia");
    expect(searchStylists).toHaveBeenCalledWith({ sort: "newest" }, 0, 8);

    const stylists = document.querySelector(
      '[data-screen-label="Stylists"]',
    ) as HTMLElement;

    expect(within(stylists).getByText(/from £30\.95/)).toBeInTheDocument();
  });

  it("hides the stylists row when no one is live yet", async () => {
    vi.mocked(searchStylists).mockResolvedValue([]);
    renderHome();

    await vi.waitFor(() => expect(searchStylists).toHaveBeenCalled());

    await vi.waitFor(() =>
      expect(
        document.querySelector('[data-screen-label="Stylists"]'),
      ).toBeNull(),
    );
  });

  it("holds the style groups' places until the catalogue loads", async () => {
    let finish: (catalogue: Catalogue) => void = () => undefined;

    vi.mocked(fetchCatalogue).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );

    renderWithStore(<HomePage />, "/", { isCatalogueLoading: true });

    expect(screen.queryByRole("link", { name: "Locs" })).toBeNull();
    expect(screen.getAllByTestId("look-tile-skeleton")).toHaveLength(6);
    expect(screen.getAllByTestId("dark-band-skeleton")).not.toHaveLength(0);

    await act(async () => finish(TEST_CATALOGUE));

    await vi.waitFor(() =>
      expect(screen.getByRole("link", { name: "Locs" })).toHaveAttribute(
        "href",
        "/search?group=locs",
      ),
    );

    expect(screen.queryAllByTestId("look-tile-skeleton")).toHaveLength(0);
    expect(screen.queryAllByTestId("dark-band-skeleton")).toHaveLength(0);
  });

  it("guests see Log in; logged-in customers see their initials menu", () => {
    const { unmount } = renderHome();

    expect(screen.getAllByRole("link", { name: "Log in" })[0]).toHaveAttribute(
      "href",
      "/login",
    );

    unmount();
    renderHome({}, "/", true);

    expect(screen.getByRole("button", { name: "Account" })).toHaveTextContent(
      "NO",
    );

    expect(
      screen.queryByRole("button", { name: "Menu" }),
    ).not.toBeInTheDocument();
  });

  it("order v2 (default) puts the photo tiles first via data-order; v1 keeps the problem first", () => {
    const { unmount } = renderHome();

    expect(document.querySelector("[data-order]")).toHaveAttribute(
      "data-order",
      "v2",
    );

    unmount();
    renderHome({ order: "v1" });

    expect(document.querySelector("[data-order]")).toHaveAttribute(
      "data-order",
      "v1",
    );
  });

  it("shows Services and Why we exist only when switched on", () => {
    renderHome({ showServices: true, showWhy: true });

    expect(
      screen.getByRole("heading", {
        name: "What are we doing with your hair?",
      }),
    ).toBeInTheDocument();

    expect(document.querySelectorAll("#wrwords > span")).toHaveLength(37);
  });

  it("stylistSection split shows the text-and-photo variant", () => {
    renderHome({ stylistSection: "split" });

    expect(screen.getByRole("link", { name: "About us" })).toHaveAttribute(
      "href",
      "/about",
    );

    expect(
      screen.getByRole("img", { name: "Stylist at work in the chair" }),
    ).toBeInTheDocument();
  });

  it("List your business remembers the flow for onboarding", async () => {
    renderHome();

    await user.click(
      screen.getAllByRole("link", {
        name: /List your business/,
      })[0] as HTMLElement,
    );

    expect(sessionStorage.getItem("tw_flow")).toBe("list");
  });

  it("FAQ opens one answer at a time", async () => {
    renderHome();

    const first = screen.getByRole("button", {
      name: "Do I need an account to book?",
    });

    const second = screen.getByRole("button", {
      name: "How do deposits work?",
    });

    await user.click(first);
    expect(first.parentElement?.className).toMatch(/open/);
    await user.click(second);
    expect(first.parentElement?.className).not.toMatch(/open/);
    expect(second.parentElement?.className).toMatch(/open/);
  });

  it("every Services link jumps to the six-styles grid, which is on the page", () => {
    renderHome();
    const links = screen.getAllByRole("link", { name: "Services" });

    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute("href", "#stylegrid"));
    expect(document.getElementById("stylegrid")).toBeInTheDocument();
  });

  it("arriving at /#stylegrid scrolls the grid into view", () => {
    const scrollIntoView = vi.fn();

    Element.prototype.scrollIntoView = scrollIntoView;
    renderHome({}, "/#stylegrid");
    expect(scrollIntoView).toHaveBeenCalled();

    expect(scrollIntoView.mock.contexts[0]).toBe(
      document.getElementById("stylegrid"),
    );
  });

  it("the burger opens the site menu, whose Services link scrolls to the grid", async () => {
    const scrollIntoView = vi.fn();

    Element.prototype.scrollIntoView = scrollIntoView;
    renderHome();
    await user.click(screen.getByRole("button", { name: "Menu" }));
    const menu = screen.getByRole("menu", { name: "Menu" });

    expect(
      within(menu).queryByRole("menuitem", { name: "Book now" }),
    ).not.toBeInTheDocument();

    await user.click(within(menu).getByRole("menuitem", { name: "Services" }));

    expect(scrollIntoView.mock.contexts.at(-1)).toBe(
      document.getElementById("stylegrid"),
    );

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("the chat plays message by message once in view", async () => {
    renderHome();
    await act(async () => observer.enter());

    expect(
      screen.queryByText("Hey, can I book knotless braids for Saturday at 10?"),
    ).not.toBeInTheDocument();

    await act(async () => vi.advanceTimersByTime(500));

    expect(
      screen.getByText("Hey, can I book knotless braids for Saturday at 10?"),
    ).toBeInTheDocument();
  });
});
