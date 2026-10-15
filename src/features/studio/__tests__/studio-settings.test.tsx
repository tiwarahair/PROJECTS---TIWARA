import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { StudioPage } from "../studio-page";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

const getLabelled = (label: string) =>
  document.querySelector(`[data-screen-label="${label}"]`) as HTMLElement;

const runNextTimer = () => act(() => void vi.advanceTimersToNextTimer());

const setViewport = (width: number) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const minWidth = /min-width:\s*(\d+)px/.exec(query);

    return {
      matches: minWidth ? width >= Number(minWidth[1]) : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });
};

const renderStudio = (query = "") => {
  renderWithStore(<StudioPage />, `/studio${query}`);
  runNextTimer();
};

describe("Studio → Settings", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "Date",
      ],
    });

    vi.setSystemTime(new Date(2026, 8, 7, 9, 0));
    localStorage.clear();
    setViewport(390);
  });

  afterEach(() => vi.useRealTimers());

  it("the narrow More tab lists the settings groups and opens a page with a back bar", async () => {
    renderStudio();
    await user.click(screen.getByRole("button", { name: "More" }));
    const root = getLabelled("Settings");

    expect(within(root).getByText("Your studio")).toBeInTheDocument();

    expect(
      within(root).getByRole("button", {
        name: /^Booking link/,
      }),
    ).toHaveAttribute("aria-disabled", "true");

    await user.click(
      within(root).getByRole("button", { name: /^Booking rules/ }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Booking rules" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByText("Your studio")).toBeInTheDocument();
  });

  it("a locked booking link explains the go-live gate", async () => {
    renderStudio();
    await user.click(screen.getByRole("button", { name: "More" }));
    await user.click(screen.getByRole("button", { name: /^Booking link/ }));

    expect(
      screen.getByText(/Finish setting up your studio/),
    ).toBeInTheDocument();
  });

  it("without uploads, the profile shows a placeholder cover and initials", async () => {
    setViewport(1440);
    renderStudio();
    await user.click(within(getLabelled("Sidebar")).getByTitle("Settings"));

    const editProfile = getLabelled("Edit profile");

    expect(
      within(editProfile).getByRole("img", { name: "Cover" }),
    ).not.toHaveAttribute("src");

    expect(
      within(editProfile).getByRole("button", { name: "Change profile photo" }),
    ).toHaveTextContent(/^[A-Z]{1,2}$/);
  });

  it("saving the profile needs at least 2 portfolio photos", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    setViewport(1440);
    renderStudio();
    await user.click(within(getLabelled("Sidebar")).getByTitle("Settings"));

    const saveProfile = () =>
      user.click(
        screen
          .getAllByRole("button", { name: "Save changes" })
          .at(-1) as HTMLElement,
      );

    await saveProfile();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Provide at least 2 portfolio images",
    );

    expect(screen.queryByText("Profile saved")).not.toBeInTheDocument();

    const photoInput = getLabelled("Edit profile").querySelector(
      "input[type=file][multiple]",
    ) as HTMLInputElement;

    await user.upload(photoInput, [
      new File(["a"], "a.jpg", { type: "image/jpeg" }),
      new File(["b"], "b.jpg", { type: "image/jpeg" }),
    ]);

    // the photos are read as previews (FileReader) before they're added
    vi.useRealTimers();
    await screen.findByText("2 of 20");

    expect(
      screen.queryByText("Provide at least 2 portfolio images"),
    ).not.toBeInTheDocument();

    await saveProfile();

    expect(screen.getByText("Profile saved")).toBeInTheDocument();
  });

  it("wide screens open on the profile page with the settings nav", async () => {
    setViewport(1440);
    renderStudio();
    await user.click(within(getLabelled("Sidebar")).getByTitle("Settings"));
    const nav = getLabelled("Settings nav");

    expect(
      within(nav).getByRole("button", { name: "Profile" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { level: 1, name: "Your profile" }),
    ).toBeInTheDocument();

    expect(screen.getByDisplayValue("Tiwára's House")).toBeInTheDocument();
    await user.click(within(nav).getByRole("button", { name: "Availability" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Availability" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Lunch")).toBeInTheDocument();
  });

  it("pausing online bookings shows what clients see", async () => {
    setViewport(1440);
    renderStudio();
    await user.click(within(getLabelled("Sidebar")).getByTitle("Settings"));

    await user.click(
      within(getLabelled("Settings nav")).getByRole("button", {
        name: "Availability",
      }),
    );

    await user.click(
      screen.getByRole("switch", { name: "Pause online bookings" }),
    );

    expect(screen.getByText("Online bookings paused")).toBeInTheDocument();

    expect(
      screen.getByText("Not taking online bookings right now"),
    ).toBeInTheDocument();
  });

  it("booking rules step the default extra time and explain it", async () => {
    setViewport(1440);
    renderStudio();
    await user.click(within(getLabelled("Sidebar")).getByTitle("Settings"));

    await user.click(
      within(getLabelled("Settings nav")).getByRole("button", {
        name: "Booking rules",
      }),
    );

    expect(screen.getByText("None")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More extra time" }));
    expect(screen.getByText("5m")).toBeInTheDocument();

    // the hidden AccountSettings has its own save bar; the page footer comes last
    await user.click(
      screen
        .getAllByRole("button", { name: "Save changes" })
        .at(-1) as HTMLElement,
    );

    expect(screen.getByText("Booking rules saved")).toBeInTheDocument();
  });

  it("saving availability ticks the setup step", async () => {
    setViewport(1440);
    renderStudio();
    await user.click(within(getLabelled("Sidebar")).getByTitle("Settings"));

    await user.click(
      within(getLabelled("Settings nav")).getByRole("button", {
        name: "Availability",
      }),
    );

    // the hidden AccountSettings has its own save bar; the page footer comes last
    await user.click(
      screen
        .getAllByRole("button", { name: "Save changes" })
        .at(-1) as HTMLElement,
    );

    runNextTimer();

    expect(
      screen.getByRole("region", { name: "Set up your studio" }),
    ).toHaveTextContent("2 of 4 done");
  });
});
