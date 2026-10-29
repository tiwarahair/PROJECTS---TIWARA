import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { getNewStudioSeed, getStudioSeed } from "../../../test/studio-seed";
import { getRow } from "../../../test/studio-booking-row";
import { fromLondonTime } from "../../../utils/london-time";
import { toDate } from "../core/blocked-time";
import { GATE_REASON } from "../core/constants";
import { StudioPage } from "..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

const getLabelled = (label: string) =>
  document.querySelector(`[data-screen-label="${label}"]`);

/** Matches min-width queries up to `width`, like a real viewport. */
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

// one timer per act, so React renders between them as the browser would
const runNextTimer = () => act(() => void vi.advanceTimersToNextTimer());

const renderStudio = (query = "", seed = getStudioSeed()) => {
  const result = renderWithStore(<StudioPage seed={seed} />, `/studio${query}`);

  runNextTimer();

  return result;
};

describe("StudioPage", () => {
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

  it("renders without crashing: narrow Home with the footer nav and setup banner", () => {
    renderStudio();
    expect(screen.getByText("Morning, Amara")).toBeInTheDocument();
    const nav = document.querySelectorAll("nav")[0] as HTMLElement;

    expect(
      within(nav)
        .getAllByRole("button")
        .map(({ textContent }) => textContent),
    ).toEqual(["Home", "Bookings", "Services", "Earnings", "More"]);

    expect(screen.getByText("Set up your studio")).toBeInTheDocument();

    expect(getLabelled("Go-live banner")).toHaveTextContent(
      "Finish setup to go live",
    );
  });

  it("every tab opens from the sidebar", async () => {
    setViewport(1440);
    renderStudio();
    const sidebar = getLabelled("Sidebar") as HTMLElement;

    for (const tab of [
      "Bookings",
      "Services",
      "Earnings",
      "Clients",
      "Settings",
    ]) {
      await user.click(within(sidebar).getByTitle(tab));
      expect(getLabelled(tab)).toBeInTheDocument();
    }
  });

  it("the gate stops the booking link until setup is done", async () => {
    renderStudio("", getNewStudioSeed());

    expect(screen.getByText("No appointments yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy booking link" }));
    expect(screen.getByText(GATE_REASON)).toBeInTheDocument();
    advance(2600);
    expect(screen.queryByText(GATE_REASON)).not.toBeInTheDocument();
  });

  it("arriving from sign-up (?welcome=1) greets the stylist by name", () => {
    renderStudio("?welcome=1");
    advance(600);

    expect(
      screen.getByText("Welcome, Amara. Let’s get you ready to take bookings."),
    ).toBeInTheDocument();
  });

  describe("a day with a finished, a checked-out and a later booking", () => {
    const getDaySeed = () =>
      getStudioSeed({
        bookings: {
          ...getStudioSeed().bookings,
          active: [
            getRow({
              id: "b-ended",
              starts_at: fromLondonTime(toDate(0), "07:00"),
            }),
            getRow({}),
          ],
          past: [
            getRow({
              id: "b-paid",
              status: "completed",
              starts_at: fromLondonTime(toDate(0), "05:00"),
              past_at: fromLondonTime(toDate(0), "06:45"),
            }),
          ],
        },
      });

    it("Today counts and lists the checked-out booking as completed", () => {
      setViewport(1440);
      renderStudio("", getDaySeed());

      expect(getLabelled("Today hero")).toHaveTextContent("2 appointments");

      const today = getLabelled("Today") as HTMLElement;

      expect(within(today).getByText("Completed")).toBeInTheDocument();
      expect(within(today).getByText("Due for checkout")).toBeInTheDocument();
    });

    it("Today's appointments says nothing else is booked once the day's bookings are over", async () => {
      vi.setSystemTime(new Date(2026, 8, 7, 21, 0));
      renderStudio("", getDaySeed());
      await user.click(screen.getByRole("button", { name: "Today" }));

      expect(screen.getByText("Nothing else today")).toBeInTheDocument();
    });

    it("Upcoming leaves out a booking that has already ended", () => {
      renderStudio("", getDaySeed());

      const upcoming = screen
        .getByRole("heading", { name: "Upcoming appointments" })
        .closest("section") as HTMLElement;

      expect(within(upcoming).getByText("14:30")).toBeInTheDocument();
      expect(within(upcoming).queryByText("07:00")).not.toBeInTheDocument();
    });
  });
});
