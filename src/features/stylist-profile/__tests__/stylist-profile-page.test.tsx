import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lookUpProfile } from "../../../lib/public-profiles";
import { toPublicStylist } from "../../../lib/public-stylist";
import { PUBLIC_PROFILE } from "../../../test/public-profile";
import { renderWithStore } from "../../../test/render-with-store";
import { getGallery } from "../profile-facts";
import { StylistProfilePage } from "../stylist-profile-route";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

vi.mock("../../../lib/public-profiles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/public-profiles")>()),
  lookUpProfile: vi.fn(),
}));

let user: UserEvent;

beforeEach(() => {
  user = setupUser();

  vi.mocked(lookUpProfile)
    .mockReset()
    .mockResolvedValue({ profile: PUBLIC_PROFILE, currentSlug: null });
});

describe("StylistProfilePage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => vi.useRealTimers());

  it("renders the stylist named in the URL with a Book now link", async () => {
    renderWithStore(<StylistProfilePage />, "/tiwaras-house");

    expect(
      await screen.findByRole("heading", { level: 1, name: /Tiwára's House/ }),
    ).toBeInTheDocument();

    expect(lookUpProfile).toHaveBeenCalledWith("tiwaras-house");

    expect(
      screen.getAllByRole("link", { name: "Book now" })[0],
    ).toHaveAttribute("href", "/book?stylist=tiwaras-house");

    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("a paused stylist has no Book now", async () => {
    vi.mocked(lookUpProfile).mockResolvedValue({
      profile: { ...PUBLIC_PROFILE, pause_on: true },
      currentSlug: null,
    });

    renderWithStore(<StylistProfilePage />, "/tiwaras-house");

    expect(
      await screen.findAllByText(/Not taking bookings right now/),
    ).not.toHaveLength(0);

    expect(
      screen.queryByRole("link", { name: "Book now" }),
    ).not.toBeInTheDocument();
  });

  it("a retired slug redirects to the current one", async () => {
    vi.mocked(lookUpProfile).mockResolvedValue({
      profile: null,
      currentSlug: "tiwaras-house",
    });

    renderWithStore(<StylistProfilePage />, "/old-name");

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/tiwaras-house",
      ),
    );
  });

  it("a malformed link shows not found instead of crashing", async () => {
    vi.mocked(lookUpProfile).mockResolvedValue({
      profile: null,
      currentSlug: null,
    });

    renderWithStore(<StylistProfilePage />, "/%E0");

    expect(
      await screen.findByRole("heading", {
        name: "We couldn’t find this stylist",
      }),
    ).toBeInTheDocument();
  });

  it("an unknown slug shows not found", async () => {
    vi.mocked(lookUpProfile).mockResolvedValue({
      profile: null,
      currentSlug: null,
    });

    renderWithStore(<StylistProfilePage />, "/nobody");

    expect(
      await screen.findByRole("heading", {
        name: "We couldn’t find this stylist",
      }),
    ).toBeInTheDocument();
  });

  it("guests get Log in returning to this profile; logged-in users get the account menu", async () => {
    const { unmount } = renderWithStore(
      <StylistProfilePage />,
      "/tiwaras-house?guest=1",
    );

    const returnParam = encodeURIComponent("/tiwaras-house");

    await screen.findByRole("heading", { level: 1 });

    expect(screen.getAllByRole("link", { name: "Log in" })[0]).toHaveAttribute(
      "href",
      `/login?screen=cust-email&return=${returnParam}`,
    );

    unmount();

    renderWithStore(<StylistProfilePage />, "/tiwaras-house", {
      signedIn: true,
    });

    expect(
      await screen.findByRole("button", { name: "Account" }),
    ).toHaveTextContent("NO");

    expect(
      screen.queryByRole("button", { name: "Menu" }),
    ).not.toBeInTheDocument();
  });

  it("a service row opens its details modal", async () => {
    renderWithStore(<StylistProfilePage />, "/tiwaras-house");

    await user.click(
      await screen.findByRole("button", { name: /^Knotless braids/ }),
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "Knotless braids" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it("See all opens the lightbox; arrows step through the gallery and Escape closes it", async () => {
    renderWithStore(<StylistProfilePage />, "/tiwaras-house");
    await user.click(await screen.findByRole("button", { name: "See all" }));
    const { stylist } = toPublicStylist(PUBLIC_PROFILE);
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
    renderWithStore(<StylistProfilePage />, "/tiwaras-house?share=open");

    await screen.findByRole("heading", { level: 1 });
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
    renderWithStore(<StylistProfilePage />, "/tiwaras-house");
    await screen.findByRole("heading", { level: 1 });
    const button = screen.getByRole("button", { name: "Menu" });

    await user.click(button);
    expect(screen.getByRole("menu", { name: "Menu" })).toBeInTheDocument();

    await user.click(button);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
