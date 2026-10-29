import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../test/render-with-store";
import { getNewStudioSeed, getStudioSeed } from "../../../../test/studio-seed";
import { getRow } from "../../../../test/studio-booking-row";
import { fromLondonTime } from "../../../../utils/london-time";
import { toDate } from "../../core/blocked-time";
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

  const getArrivedSeed = () =>
    getStudioSeed({
      bookings: {
        ...getStudioSeed().bookings,
        active: [
          getRow({
            status: "arrived",
            starts_at: fromLondonTime(toDate(0), "08:00"),
          }),
        ],
      },
    });

  it("an arrived booking is in progress until its end time", async () => {
    await renderBookings(getArrivedSeed());

    expect(
      within(getLabelled("Bookings")).getByText("In progress"),
    ).toBeInTheDocument();
  });

  it("an arrived booking past its end time is due for checkout", async () => {
    vi.setSystemTime(new Date(2026, 8, 7, 10, 0));
    await renderBookings(getArrivedSeed());
    const bookings = getLabelled("Bookings");

    expect(within(bookings).getByText("Due for checkout")).toBeInTheDocument();
    expect(within(bookings).queryByText("In progress")).not.toBeInTheDocument();
  });

  it("a checked-out booking stays on the day, marked completed", async () => {
    await renderBookings(
      getStudioSeed({
        bookings: {
          ...getStudioSeed().bookings,
          past: [
            getRow({
              id: "b-paid",
              status: "completed",
              starts_at: fromLondonTime(toDate(0), "07:00"),
              past_at: fromLondonTime(toDate(0), "08:45"),
            }),
          ],
        },
      }),
    );

    const bookings = getLabelled("Bookings");

    expect(within(bookings).getByText("Nia Okafor")).toBeInTheDocument();
    expect(within(bookings).getByText("Completed")).toBeInTheDocument();
  });

  it("after midnight, yesterday's checked-out booking leaves today", async () => {
    await renderBookings(
      getStudioSeed({
        bookings: {
          ...getStudioSeed().bookings,
          past: [
            getRow({
              id: "b-paid",
              status: "completed",
              starts_at: fromLondonTime(toDate(0), "07:00"),
              past_at: fromLondonTime(toDate(0), "08:45"),
            }),
          ],
        },
      }),
    );

    vi.setSystemTime(new Date(2026, 8, 8, 9, 0));
    act(() => vi.advanceTimersByTime(30000));

    expect(
      within(getLabelled("Bookings")).queryByText("Completed"),
    ).not.toBeInTheDocument();
  });

  it("an ended booking whose card failed says so instead of due for checkout", async () => {
    vi.setSystemTime(new Date(2026, 8, 7, 10, 0));

    await renderBookings(
      getStudioSeed({
        bookings: {
          ...getStudioSeed().bookings,
          active: [
            getRow({
              status: "arrived",
              starts_at: fromLondonTime(toDate(0), "08:00"),
              card_failed_at: "2026-09-07T07:00:00+00:00",
            }),
          ],
        },
      }),
    );

    const bookings = getLabelled("Bookings");

    expect(within(bookings).getByText("Payment failed")).toBeInTheDocument();

    expect(
      within(bookings).queryByText("Due for checkout"),
    ).not.toBeInTheDocument();
  });

  it("the week strip marks a day that only has finished bookings", async () => {
    vi.setSystemTime(new Date(2026, 8, 9, 9, 0));

    await renderBookings(
      getStudioSeed({
        bookings: {
          ...getStudioSeed().bookings,
          active: [],
          past: [
            getRow({
              id: "b-paid",
              status: "completed",
              starts_at: fromLondonTime(toDate(-2), "11:00"),
              past_at: fromLondonTime(toDate(-2), "12:45"),
            }),
          ],
        },
      }),
    );

    const monday = within(getLabelled("Bookings"))
      .getAllByRole("button", { name: /^mon\s*7$/i })
      .at(0) as HTMLElement;

    expect(monday.querySelector("[style]")).toHaveStyle({
      "--dot": "var(--accent-700)",
    });
  });

  it("a new account sees the empty calendar card until it is closed", async () => {
    await renderBookings(getNewStudioSeed());

    const empty = getLabelled("Calendar empty");

    expect(empty).toHaveTextContent("No appointments yet");
    await user.click(within(empty).getByRole("button", { name: "Close" }));
    expect(getLabelled("Calendar empty")).toBeNull();
  });
});
