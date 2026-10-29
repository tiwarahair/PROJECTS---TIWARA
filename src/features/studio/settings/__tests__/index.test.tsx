import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../test/render-with-store";
import { getStudioSeed } from "../../../../test/studio-seed";
import { saveBookingRules } from "../../../../lib/studio-api/settings";
import { StudioPage } from "../..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../../test/setup-user";

// saves stay in flight, so the screen keeps what was done
vi.mock("../../../../lib/studio-api/settings", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../lib/studio-api/settings")
  >()),
  updateStylist: vi.fn(() => new Promise(() => {})),
  saveHours: vi.fn(() => new Promise(() => {})),
  saveBookingRules: vi.fn(() => new Promise(() => {})),
}));

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

const renderStudio = () => {
  renderWithStore(<StudioPage seed={getStudioSeed()} />, "/studio", {
    signedIn: true,
  });

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

    const saveProfile = async () => {
      await user.click(
        screen
          .getAllByRole("button", { name: "Save changes" })
          .at(-1) as HTMLElement,
      );

      await act(() => Promise.resolve());
    };

    await saveProfile();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Provide at least 2 portfolio images",
    );

    expect(screen.queryByText("Profile saved")).not.toBeInTheDocument();

    const nav = getLabelled("Settings nav");

    await user.click(within(nav).getByRole("button", { name: "Availability" }));
    await user.click(within(nav).getByRole("button", { name: "Profile" }));

    expect(
      screen.queryByText("Provide at least 2 portfolio images"),
    ).not.toBeInTheDocument();

    await saveProfile();

    expect(screen.getByRole("alert")).toBeInTheDocument();

    const photoInput = getLabelled("Edit profile").querySelector(
      "input[type=file][multiple]",
    ) as HTMLInputElement;

    await user.upload(photoInput, [
      new File(["a"], "a.jpg", { type: "image/jpeg" }),
      new File(["b"], "b.jpg", { type: "image/jpeg" }),
    ]);

    vi.useRealTimers();
    await screen.findByText("2 of 20");

    await waitFor(() =>
      expect(
        screen.queryByText("Provide at least 2 portfolio images"),
      ).not.toBeInTheDocument(),
    );

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

    expect(screen.getByDisplayValue("Amara Hair")).toBeInTheDocument();
    await user.click(within(nav).getByRole("button", { name: "Availability" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Availability" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Working hours")).toBeInTheDocument();
  });

  it("social fields take just the username", async () => {
    setViewport(1440);
    renderStudio();
    await user.click(within(getLabelled("Sidebar")).getByTitle("Settings"));
    const instagram = screen.getByPlaceholderText("Instagram username");

    expect(screen.getByPlaceholderText("TikTok username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("YouTube username")).toBeInTheDocument();

    await user.clear(instagram);
    await user.type(instagram, "@tiwarashouse");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Leave out the @, just your username",
    );

    await user.click(
      screen.getAllByRole("button", { name: "Save changes" }).at(-1)!,
    );

    expect(
      await screen.findByText("Check your social usernames first."),
    ).toBeInTheDocument();
  });

  it("checks the profile email and website", async () => {
    setViewport(1440);
    renderStudio();
    await user.click(within(getLabelled("Sidebar")).getByTitle("Settings"));

    const email = screen.getByLabelText("Email");
    const website = screen.getByLabelText("Website");

    await user.clear(email);
    await user.type(email, "amara@");
    await user.clear(website);
    await user.type(website, "my salon");
    await user.tab();

    expect(
      await screen.findByText(
        "Enter an email address, like name@example.co.uk.",
      ),
    ).toBeInTheDocument();

    expect(
      await screen.findByText(
        "Enter a website address, like tiwarashouse.com.",
      ),
    ).toBeInTheDocument();

    await user.clear(website);
    await user.type(website, "tiwarashouse.com");

    await waitFor(() =>
      expect(
        screen.queryByText("Enter a website address, like tiwarashouse.com."),
      ).not.toBeInTheDocument(),
    );
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

    expect(
      screen.getByText("Not taking online bookings right now"),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Online bookings paused"),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: "Save changes" }).at(-1)!,
    );

    expect(await screen.findByText("Availability saved")).toBeInTheDocument();
  });

  it("a working day must close after it opens", async () => {
    setViewport(1440);
    renderStudio();
    await user.click(within(getLabelled("Sidebar")).getByTitle("Settings"));

    await user.click(
      within(getLabelled("Settings nav")).getByRole("button", {
        name: "Availability",
      }),
    );

    const [start, end] = within(getLabelled("Availability")).getAllByRole(
      "combobox",
    );

    await user.selectOptions(start!, "18:00");
    await user.selectOptions(end!, "09:00");

    expect(
      await screen.findByText("Closing time must be after opening time."),
    ).toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: "Save changes" }).at(-1)!,
    );

    expect(screen.queryByText("Availability saved")).not.toBeInTheDocument();
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

  it("minimum notice saves in minutes, so 30 minutes is kept", async () => {
    setViewport(1440);
    renderStudio();
    await user.click(within(getLabelled("Sidebar")).getByTitle("Settings"));

    await user.click(
      within(getLabelled("Settings nav")).getByRole("button", {
        name: "Booking rules",
      }),
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Minimum notice" }),
      "30",
    );

    await user.click(
      screen
        .getAllByRole("button", { name: "Save changes" })
        .at(-1) as HTMLElement,
    );

    expect(saveBookingRules).toHaveBeenCalledWith(
      expect.objectContaining({ min_notice_minutes: 30 }),
    );
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

    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "Set up your studio" }),
      ).toHaveTextContent("2 of 4 done"),
    );
  });
});
