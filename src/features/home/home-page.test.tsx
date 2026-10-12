import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeIntersectionObserver } from "../../test/helpers";
import type { FakeIntersectionObserver } from "../../test/helpers";
import { renderWithStore } from "../../test/render-with-store";
import { HomePage } from "./home-page";
import type { HomePageProps } from "./home-page";

let observer: FakeIntersectionObserver;

const renderHome = (props: HomePageProps = {}, url = "/") =>
  renderWithStore(<HomePage {...props} />, url);

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

  it("lists every stylist with a link to their profile", () => {
    renderHome();

    const stylists = document.querySelector(
      '[data-screen-label="Stylists"]',
    ) as HTMLElement;

    expect(
      within(stylists).getAllByRole("link", { name: "Amara Beauty" })[0],
    ).toHaveAttribute("href", "/stylist?stylist=amara-beauty");

    expect(within(stylists).getByText("from £81.70")).toBeInTheDocument();
  });

  it("guests see Log in; logged-in customers see their initials menu", () => {
    renderHome();

    expect(screen.getAllByRole("link", { name: "Log in" })[0]).toHaveAttribute(
      "href",
      "/login",
    );

    sessionStorage.setItem("tw_cust", "1");
    renderHome();

    const accountLinks = screen.getAllByRole("link", { name: "Account" });

    expect(
      accountLinks.find((link) => link.getAttribute("href") === "/account"),
    ).toHaveTextContent("NO");

    expect(
      screen.queryByRole("link", { name: "Nia Okafor" }),
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

    expect(
      screen.getByRole("button", { name: "About us" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("img", { name: "Stylist at work in the chair" }),
    ).toBeInTheDocument();
  });

  it("List your business remembers the flow for onboarding", () => {
    renderHome();

    fireEvent.click(
      screen.getAllByRole("link", {
        name: /List your business/,
      })[0] as HTMLElement,
    );

    expect(sessionStorage.getItem("tw_flow")).toBe("list");
  });

  it("FAQ opens one answer at a time", () => {
    renderHome();

    const first = screen.getByRole("button", {
      name: "Do I need an account to book?",
    });

    const second = screen.getByRole("button", {
      name: "How do deposits work?",
    });

    fireEvent.click(first);
    expect(first.parentElement?.className).toMatch(/open/);
    fireEvent.click(second);
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

  it("the burger opens and closes the mobile menu", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(
      screen.getByRole("link", { name: "Our stylists" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "×" }));

    expect(
      screen.queryByRole("link", { name: "Our stylists" }),
    ).not.toBeInTheDocument();
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
