import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../test/render-with-store";
import { StudioPage } from "../..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

const getLabelled = (label: string) =>
  document.querySelector(`[data-screen-label="${label}"]`) as HTMLElement;

const runNextTimer = () => act(() => void vi.advanceTimersToNextTimer());
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

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

const openAvailability = async () => {
  await user.click(within(getLabelled("Sidebar")).getByTitle("Settings"));

  await user.click(
    within(getLabelled("Settings nav")).getByRole("button", {
      name: "Availability",
    }),
  );
};

describe("Studio sheets", () => {
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
    setViewport(1440);
  });

  afterEach(() => vi.useRealTimers());

  it("notifications mark as read and deep-link into the studio", async () => {
    renderStudio();
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    // Home's activity feed shows it too
    expect(screen.getAllByText("Late cancellation")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Mark all read" }));
    expect(screen.getByText("All caught up")).toBeInTheDocument();

    // the sheet's rows come after Home's activity feed
    await user.click(
      screen
        .getAllByRole("button", { name: /^Payout sent/ })
        .at(-1) as HTMLElement,
    );

    advance(240);
    expect(getLabelled("Earnings")).toBeInTheDocument();
  });

  it("blocking time over a booking asks first, then adds it", async () => {
    renderStudio();
    await openAvailability();

    await user.click(
      screen.getAllByRole("button", { name: "Add" })[0] as HTMLElement,
    );

    expect(screen.getByText("Block time")).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("e.g. Lunch (optional)"),
      "Dentist",
    );

    await user.click(screen.getByRole("button", { name: "Block this time" }));
    expect(screen.getByText("This overlaps 1 booking")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Keep bookings and block" }),
    );

    runNextTimer();
    expect(screen.getByText("Time blocked")).toBeInTheDocument();
    advance(220);
    expect(screen.getByText("Dentist")).toBeInTheDocument();
  });

  it("a closed period needs both dates", async () => {
    renderStudio();
    await openAvailability();

    await user.click(
      screen.getAllByRole("button", { name: "Add" })[1] as HTMLElement,
    );

    const add = screen.getByRole("button", { name: "Add closed period" });

    expect(add).toBeDisabled();

    const [from, to] =
      document.querySelectorAll<HTMLInputElement>('input[type="date"]');

    await user.type(from as HTMLInputElement, "2026-12-24");

    await user.type(to as HTMLInputElement, "2026-12-28");

    await user.click(add);

    expect(
      screen.getByText("Closed period added. Online booking blocked"),
    ).toBeInTheDocument();

    advance(220);
    expect(screen.getByText("24 Dec to 28 Dec")).toBeInTheDocument();
  });

  it("connecting Stripe ticks the payouts step", async () => {
    renderStudio("?fixture=stripe-sheet");
    runNextTimer();

    await user.click(
      screen.getByRole("button", { name: "Continue with Stripe" }),
    );

    expect(screen.getByRole("button", { name: "Connecting" })).toBeDisabled();
    advance(1400);

    expect(
      screen.getByText("Stripe connected. You can take payments"),
    ).toBeInTheDocument();
  });
});
