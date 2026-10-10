import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../test/render-with-store";
import { StudioPage } from "./studio-page";

const getLabelled = (label: string) =>
  document.querySelector('[data-screen-label="' + label + '"]') as HTMLElement;
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

const renderBookings = (query = "") => {
  renderWithStore(<StudioPage />, "/studio?fixture=cal-day" + query);
  runNextTimer();
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

  it("the day timeline shows the day's bookings and blocked time", () => {
    renderBookings();
    const bookings = getLabelled("Bookings");
    expect(within(bookings).getByText("Today, Mon 7 Sep")).toBeInTheDocument();
    expect(within(bookings).getByText("Nia Okafor")).toBeInTheDocument();
    expect(
      within(bookings).getByText("Knotless braids · £85"),
    ).toBeInTheDocument();
    expect(within(bookings).getByText("Lunch")).toBeInTheDocument();
    expect(
      within(bookings).getByRole("button", { name: "Today" }),
    ).toBeDisabled();
    fireEvent.click(
      within(bookings).getByRole("button", { name: "Next week" }),
    );
    expect(within(bookings).getByText("Mon 14 Sep")).toBeInTheDocument();
    expect(
      within(bookings).getByRole("button", { name: "Today" }),
    ).toBeEnabled();
  });

  it("switches to the week grid", () => {
    renderBookings();
    fireEvent.click(screen.getByRole("button", { name: "Week" }));
    const week = getLabelled("Week view");
    expect(
      within(week).getAllByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/),
    ).toHaveLength(7);
    expect(within(week).getByText("Kemi Adeyemi")).toBeInTheDocument();
  });

  it("the list groups upcoming bookings by day, searches and filters", () => {
    renderBookings();
    fireEvent.click(screen.getByRole("button", { name: "List" }));
    const bookings = getLabelled("Bookings");
    expect(
      within(bookings).getByText("9 bookings upcoming"),
    ).toBeInTheDocument();
    expect(within(bookings).getByText("Today")).toBeInTheDocument();
    expect(within(bookings).getByText("Tomorrow")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Search client or service"), {
      target: { value: "silk" },
    });
    expect(
      within(bookings).getByText("2 bookings upcoming"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Search client or service"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Filter bookings" }));
    fireEvent.click(screen.getByRole("button", { name: /^Paid in full/ }));
    expect(
      screen.getByRole("button", { name: "Show 1 booking" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show 1 booking" }));
    act(() => vi.advanceTimersByTime(210));
    expect(
      within(bookings).getByText("1 booking upcoming"),
    ).toBeInTheDocument();
    fireEvent.click(
      within(bookings).getAllByRole("button", {
        name: "Clear all",
      })[0] as HTMLElement,
    );
    expect(
      within(bookings).getByText("9 bookings upcoming"),
    ).toBeInTheDocument();
  });

  it("the past list shows outcomes by month", () => {
    renderBookings();
    fireEvent.click(screen.getByRole("button", { name: "List" }));
    fireEvent.click(screen.getByRole("button", { name: "Past" }));
    const bookings = getLabelled("Bookings");
    expect(
      within(bookings).getByText("10 appointments · 4 completed"),
    ).toBeInTheDocument();
    expect(within(bookings).getByText("August")).toBeInTheDocument();
    expect(within(bookings).getAllByText("No show")).toHaveLength(2);
    expect(within(bookings).getByText("Fee pending")).toBeInTheDocument();
  });

  it("tapping the narrow timeline offers to book or block that slot", () => {
    renderBookings();
    const timeline = document.getElementById("tl-h-09")
      ?.parentElement as HTMLElement;
    timeline.getBoundingClientRect = () =>
      ({ top: 0, height: 3086 }) as DOMRect;
    fireEvent.click(timeline, { clientY: 128 * 9 + 70 });
    expect(screen.getByText("Today · 09:30")).toBeInTheDocument();
    expect(screen.getByText("Book a client in at 09:30")).toBeInTheDocument();
    expect(screen.getByText("Keep 09:30 to 10:30 free")).toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Close" }).at(-1) as HTMLElement,
    );
    act(() => vi.advanceTimersByTime(210));
    expect(
      screen.queryByText("Book a client in at 09:30"),
    ).not.toBeInTheDocument();
  });

  it("wide screens open a popover on the tapped slot", () => {
    setViewport(1440);
    renderBookings();
    const timeline = document.getElementById("tl-h-09")
      ?.parentElement as HTMLElement;
    timeline.getBoundingClientRect = () =>
      ({ top: 0, height: 3086 }) as DOMRect;
    fireEvent.click(timeline, { clientX: 400, clientY: 128 * 20 + 10 });
    expect(screen.getByText("20:00")).toBeInTheDocument();
    expect(screen.getByText("· outside working hours")).toBeInTheDocument();
  });

  it("a new account sees the empty calendar card until it is closed", () => {
    renderWithStore(<StudioPage />, "/studio?account=new");
    runNextTimer();
    fireEvent.click(screen.getByRole("button", { name: "Bookings" }));
    const empty = getLabelled("Calendar empty");
    expect(empty).toHaveTextContent("No appointments yet");
    fireEvent.click(within(empty).getByRole("button", { name: "Close" }));
    expect(getLabelled("Calendar empty")).toBeNull();
  });
});
