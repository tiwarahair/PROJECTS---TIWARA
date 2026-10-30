import { screen, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { ForStylistsPage } from "..";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();

  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

const renderPage = () => renderWithStore(<ForStylistsPage />, "/for-stylists");

const getPanelTitles = () =>
  within(screen.getByRole("tabpanel"))
    .getAllByRole("heading", { level: 3 })
    .map(({ textContent }) => textContent);

describe("ForStylistsPage", () => {
  it("renders the sections in order between the nav and footer", () => {
    renderPage();

    const labels = [...document.querySelectorAll("[data-screen-label]")].map(
      (element) => element.getAttribute("data-screen-label"),
    );

    expect(labels).toEqual([
      "For stylists",
      "Nav",
      "Hero",
      "Benefits",
      "Statement",
      "List your business",
      "Footer",
    ]);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "More than bookings.A better way to runyour hair business.",
    );

    expect(document.documentElement).toHaveClass("story-page");
  });

  it("marks For stylists as the current page in the nav", () => {
    renderPage();

    const nav = screen.getByRole("navigation");

    expect(
      within(nav).getByRole("link", { name: "For stylists" }),
    ).toHaveAttribute("aria-current", "page");

    expect(
      within(nav).getByRole("link", { name: "About" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("opens on Grow and switches benefits by tab, with each tab's count", async () => {
    renderPage();

    const tabs = screen.getAllByRole("tab");

    expect(tabs.map(({ textContent }) => textContent)).toEqual([
      "Grow3",
      "Save time1",
      "Protect1",
      "Your way2",
    ]);

    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    expect(getPanelTitles()).toEqual([
      "Fill your calendar",
      "Reach clients across the UK",
      "A profile that shows off your work",
    ]);

    await user.click(screen.getByRole("tab", { name: /Your way/ }));

    expect(screen.getByRole("tab", { name: /Your way/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    expect(tabs[0]).toHaveAttribute("aria-selected", "false");

    expect(getPanelTitles()).toEqual([
      "Run it your way",
      "Know how your business is doing",
    ]);
  });

  it("sends stylists to sign up and log in", () => {
    renderPage();

    screen
      .getAllByRole("link", { name: /List your business/ })
      .forEach((link) => expect(link).toHaveAttribute("href", "/join"));

    expect(
      screen.getByRole("link", { name: "See the benefits" }),
    ).toHaveAttribute("href", "#benefits");

    expect(
      within(screen.getByText(/Already listed\?/)).getByRole("link", {
        name: "Log in",
      }),
    ).toHaveAttribute("href", "/login");
  });
});
