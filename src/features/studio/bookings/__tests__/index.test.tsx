import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../test/render-with-store";
import { getNewStudioSeed, getStudioSeed } from "../../../../test/studio-seed";
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

const renderBookings = async (seed = getStudioSeed()) => {
  renderWithStore(<StudioPage seed={seed} />, "/studio");
  runNextTimer();
  await user.click(screen.getByRole("button", { name: "Bookings" }));
};

describe("Studio → Bookings", () => {
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

    // a Monday morning, before any of the day's bookings
    vi.setSystemTime(new Date(2026, 8, 7, 9, 0));
    localStorage.clear();
    setViewport(390);

    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(0), 0);
  });

  afterEach(() => vi.useRealTimers());

  it("the day timeline moves between days and weeks", async () => {
    await renderBookings();
    const bookings = getLabelled("Bookings");

    expect(within(bookings).getByText("Today, Mon 7 Sep")).toBeInTheDocument();

    expect(
      within(bookings).getByRole("button", { name: "Today" }),
    ).toBeDisabled();

    await user.click(
      within(bookings).getByRole("button", { name: "Next week" }),
    );

    expect(within(bookings).getByText("Mon 14 Sep")).toBeInTheDocument();

    expect(
      within(bookings).getByRole("button", { name: "Today" }),
    ).toBeEnabled();
  });

  it("switches to the week grid", async () => {
    await renderBookings();
    await user.click(screen.getByRole("button", { name: "Week" }));
    const week = getLabelled("Week view");

    expect(
      within(week).getAllByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/),
    ).toHaveLength(7);

    expect(within(week).getByText("Nia Okafor")).toBeInTheDocument();
  });

  it("the list shows upcoming bookings and searches them", async () => {
    await renderBookings();
    await user.click(screen.getByRole("button", { name: "List" }));
    const bookings = getLabelled("Bookings");

    expect(
      within(bookings).getByText("1 booking upcoming"),
    ).toBeInTheDocument();

    expect(within(bookings).getByText("Nia Okafor")).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("Search client or service"),
      "braids",
    );

    expect(within(bookings).queryByText("Nia Okafor")).not.toBeInTheDocument();
  });

  it("the filter dialog only filters the list on Show, and closing it keeps the list as it was", async () => {
    await renderBookings();
    await user.click(screen.getByRole("button", { name: "List" }));
    const bookings = getLabelled("Bookings");

    await user.click(screen.getByRole("button", { name: "Filter bookings" }));
    await user.click(screen.getByRole("button", { name: /^Arrived/ }));

    expect(within(bookings).getByText("Nia Okafor")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Show 0 bookings" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    runNextTimer();

    expect(within(bookings).getByText("Nia Okafor")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filter bookings" }));

    expect(
      screen.getByRole("button", { name: "Show 1 booking" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Arrived/ }));
    await user.click(screen.getByRole("button", { name: "Show 0 bookings" }));

    expect(within(bookings).queryByText("Nia Okafor")).not.toBeInTheDocument();
  });

  it("the past list shows finished appointments", async () => {
    await renderBookings();
    await user.click(screen.getByRole("button", { name: "List" }));
    await user.click(screen.getByRole("button", { name: "Past" }));
    const bookings = getLabelled("Bookings");

    expect(
      within(bookings).getByText("1 appointment · 1 completed"),
    ).toBeInTheDocument();

    expect(within(bookings).getByText("Nia Okafor")).toBeInTheDocument();
  });

  it("tapping the narrow timeline offers to book or block that slot", async () => {
    await renderBookings();

    const timeline = document.getElementById("tl-h-09")
      ?.parentElement as HTMLElement;

    timeline.getBoundingClientRect = () =>
      ({ top: 0, height: 3086 }) as DOMRect;

    await user.pointer({
      keys: "[MouseLeft]",
      target: timeline,
      coords: { clientY: 128 * 9 + 70 },
    });

    expect(screen.getByText("Today · 09:30")).toBeInTheDocument();
    expect(screen.getByText("Book a client in at 09:30")).toBeInTheDocument();
    expect(screen.getByText("Keep 09:30 to 10:30 free")).toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: "Close" }).at(-1) as HTMLElement,
    );

    act(() => vi.advanceTimersByTime(210));

    expect(
      screen.queryByText("Book a client in at 09:30"),
    ).not.toBeInTheDocument();
  });

  it("wide screens open a popover on the tapped slot", async () => {
    setViewport(1440);
    await renderBookings();

    const timeline = document.getElementById("tl-h-09")
      ?.parentElement as HTMLElement;

    timeline.getBoundingClientRect = () =>
      ({ top: 0, height: 3086 }) as DOMRect;

    await user.pointer({
      keys: "[MouseLeft]",
      target: timeline,
      coords: { clientX: 400, clientY: 128 * 20 + 10 },
    });

    expect(screen.getByText("20:00")).toBeInTheDocument();
    expect(screen.getByText("· outside working hours")).toBeInTheDocument();
  });

  it("a new account sees the empty calendar card until it is closed", async () => {
    await renderBookings(getNewStudioSeed());

    const empty = getLabelled("Calendar empty");

    expect(empty).toHaveTextContent("No appointments yet");
    await user.click(within(empty).getByRole("button", { name: "Close" }));
    expect(getLabelled("Calendar empty")).toBeNull();
  });
});
