import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { StudioPage } from "../studio-page";

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

const openNewBooking = () => {
  renderWithStore(<StudioPage />, "/studio");
  runNextTimer();

  fireEvent.click(
    screen.getAllByRole("button", { name: "New booking" })[0] as HTMLElement,
  );

  advance(300);
};

const getContinue = () =>
  screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;

describe("Studio → New booking", { timeout: 15_000 }, () => {
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

  it("searches clients and offers to add an unknown name", () => {
    openNewBooking();
    expect(screen.getByText("Who is it for?")).toBeInTheDocument();
    expect(getContinue()).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Search by name or phone"), {
      target: { value: "Zed" },
    });

    expect(
      screen.getByRole("button", { name: "Add “Zed” as a new client" }),
    ).toBeInTheDocument();
  });

  it("books a client through service, time and protection", () => {
    openNewBooking();

    // Home lists Nia too; the sheet comes last
    fireEvent.click(
      screen
        .getAllByRole("button", { name: /^Nia Okafor/ })
        .at(-1) as HTMLElement,
    );

    // picking a client moves straight to the service list
    fireEvent.click(screen.getByRole("button", { name: /^Knotless braids/ }));
    expect(screen.getByText("Selected service")).toBeInTheDocument();
    fireEvent.click(getContinue());
    expect(screen.getByText("When?")).toBeInTheDocument();

    fireEvent.click(
      screen.getAllByRole("button", { name: /^Tue/ })[0] as HTMLElement,
    );

    fireEvent.click(
      screen
        .getAllByRole("button", { name: /^\d\d:\d\d$/ })
        .at(-1) as HTMLElement,
    );

    fireEvent.click(getContinue());
    expect(screen.getByText("Booking protection")).toBeInTheDocument();
    fireEvent.click(getContinue());
    expect(screen.getByText("Anything else?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm booking" }));

    expect(
      screen.getByText("Booking added for Nia. Payment link sent"),
    ).toBeInTheDocument();
  });

  it("a walk-in skips booking protection", () => {
    openNewBooking();

    fireEvent.click(
      screen.getByRole("button", { name: "No client, this is a walk-in" }),
    );

    fireEvent.click(screen.getByRole("button", { name: /^Knotless braids/ }));
    fireEvent.click(getContinue());

    fireEvent.click(
      screen.getAllByRole("button", { name: /^Tue/ })[0] as HTMLElement,
    );

    fireEvent.click(
      screen
        .getAllByRole("button", { name: /^\d\d:\d\d$/ })
        .at(-1) as HTMLElement,
    );

    fireEvent.click(getContinue());
    expect(screen.getByText("Anything else?")).toBeInTheDocument();
  });
});
