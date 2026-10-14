import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { getGallery, getStylist } from "../profile-logic";
import { StylistProfilePage } from "../stylist-profile-page";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

describe("StylistProfilePage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => vi.useRealTimers());

  it("renders the stylist named in the URL with a Book now link", () => {
    renderWithStore(<StylistProfilePage />, "/stylist?stylist=naturallynia");

    expect(
      screen.getByRole("heading", { level: 1, name: /NaturallyNia/ }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole("link", { name: "Book now" })[0],
    ).toHaveAttribute("href", "/book?stylist=naturallynia");
  });

  it("guests get Log in returning to this profile; logged-in users get the account menu", () => {
    const { unmount } = renderWithStore(
      <StylistProfilePage />,
      "/stylist?stylist=tiwaras-house&guest=1",
    );

    const returnParam = encodeURIComponent("/stylist?stylist=tiwaras-house");

    expect(screen.getAllByRole("link", { name: "Log in" })[0]).toHaveAttribute(
      "href",
      `/login?screen=cust-email&return=${returnParam}`,
    );

    unmount();

    renderWithStore(<StylistProfilePage />, "/stylist?stylist=tiwaras-house", {
      signedIn: true,
    });

    expect(screen.getByRole("button", { name: "Account" })).toHaveTextContent(
      "NO",
    );

    expect(
      screen.queryByRole("button", { name: "Menu" }),
    ).not.toBeInTheDocument();
  });

  it("a service row opens its details modal", async () => {
    renderWithStore(<StylistProfilePage />, "/stylist?stylist=tiwaras-house");
    await user.click(screen.getByRole("button", { name: /^Knotless braids/ }));

    expect(
      screen.getByRole("heading", { level: 3, name: "Knotless braids" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it("See all opens the lightbox; arrows step through the gallery and Escape closes it", async () => {
    renderWithStore(<StylistProfilePage />, "/stylist?stylist=tiwaras-house");
    await user.click(screen.getByRole("button", { name: "See all" }));
    const stylist = getStylist("tiwaras-house");
    const gallery = getGallery(stylist);
    const first = Math.max(0, gallery.indexOf(stylist.portfolio[0] ?? ""));

    const getCounter = (index: number) =>
      `${(index % gallery.length) + 1} / ${gallery.length}`;

    expect(screen.getByText(getCounter(first))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText(getCounter(first + 1))).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText(getCounter(first))).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByText(getCounter(first))).not.toBeInTheDocument();
  });

  it("?share=open opens the share popover; Escape closes it", async () => {
    renderWithStore(
      <StylistProfilePage />,
      "/stylist?stylist=amara-beauty&share=open",
    );

    act(() => vi.advanceTimersByTime(700));
    const popover = screen.getByRole("dialog", { name: "Share this stylist" });

    expect(
      within(popover).getByRole("link", { name: "WhatsApp" }),
    ).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\//));

    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: "Share this stylist" }),
    ).not.toBeInTheDocument();
  });

  it("the menu button toggles the site menu open and closed", async () => {
    renderWithStore(<StylistProfilePage />, "/stylist?stylist=tiwaras-house");
    const button = screen.getByRole("button", { name: "Menu" });

    await user.click(button);
    expect(screen.getByRole("menu", { name: "Menu" })).toBeInTheDocument();

    await user.click(button);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
