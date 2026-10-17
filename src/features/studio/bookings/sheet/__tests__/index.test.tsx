import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../../test/render-with-store";
import { StudioPage } from "../../..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../../../test/setup-user";

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

const openNia = async () => {
  renderWithStore(<StudioPage />, "/studio?fixture=cal-day");
  runNextTimer();
  await user.click(within(getLabelled("Bookings")).getByText("Nia Okafor"));
  advance(400);
};

const openMoreItem = async (label: string) => {
  await user.click(
    screen
      .getAllByRole("button", { name: "More actions" })
      .at(-1) as HTMLElement,
  );

  await user.click(screen.getByRole("button", { name: label }));
  advance(400);
};

describe("Studio → booking sheet", () => {
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

    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(0), 0);
  });

  afterEach(() => vi.useRealTimers());

  it("opens a booking with its service and client", async () => {
    await openNia();

    expect(
      screen.getByRole("button", { name: "Edit service" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "See payment breakdown" }),
    ).toBeInTheDocument();
  });

  it("edits the service and adjusts the price for this booking", async () => {
    await openNia();
    await user.click(screen.getByRole("button", { name: "Edit service" }));
    advance(400);
    await user.click(screen.getByRole("button", { name: "Adjust price" }));

    expect(
      screen.getByPlaceholderText("e.g. Extra length added"),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });

  it("adds an add-on and edits it for this booking only", async () => {
    await openNia();
    await user.click(screen.getByRole("button", { name: "Edit service" }));
    advance(400);
    await user.click(screen.getByRole("button", { name: "Add" }));
    advance(400);

    await user.click(
      document.querySelector("button[aria-pressed]") as HTMLElement,
    );

    await user.click(screen.getByRole("button", { name: /^Done/ }));
    advance(400);
    await user.click(document.querySelector("[data-aorow]") as HTMLElement);

    expect(
      screen.getAllByText(
        "Only this booking changes. Your saved add-on stays as it is.",
      ),
    ).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Remove add-on" }));
    advance(400);
    expect(document.querySelector("[data-aorow]")).toBeNull();
  });

  it("reschedule, cancel and no-show open from the more menu", async () => {
    await openNia();
    await openMoreItem("Reschedule");
    expect(screen.getAllByText("Reschedule").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Back" }));
    advance(400);
    await openMoreItem("Cancel");
    expect(screen.getByText("I am cancelling")).toBeInTheDocument();
  });

  it("asks before moving onto another booking, and Go back keeps it", async () => {
    await openNia();
    await openMoreItem("Reschedule");

    await user.click(
      screen
        .getAllByRole("button", { name: /^mon\s*7$/i })
        .at(-1) as HTMLElement,
    );

    await user.click(screen.getByRole("button", { name: "Custom time" }));
    await user.type(screen.getByLabelText("Custom start time"), "15:00");
    await user.click(screen.getByRole("button", { name: "Move booking" }));

    expect(
      screen.getByText("This time clashes with another booking"),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/^Overlaps Ruth/, { selector: "strong" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Go back" }));
    advance(400);

    expect(screen.queryByText(/^Moved to/)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Move booking" }));
    await user.click(screen.getByRole("button", { name: "Move anyway" }));
    advance(400);

    expect(screen.getByText(/^Moved to Today, 15:00/)).toBeInTheDocument();
  });
});
