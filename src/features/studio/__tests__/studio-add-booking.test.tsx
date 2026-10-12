import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { StudioPage } from "../studio-page";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

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

const openNewBooking = async () => {
  renderWithStore(<StudioPage />, "/studio");
  runNextTimer();

  await user.click(
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

  it("searches clients and offers to add an unknown name", async () => {
    await openNewBooking();
    expect(screen.getByText("Who is it for?")).toBeInTheDocument();
    expect(getContinue()).toBeDisabled();

    await user.type(
      screen.getByPlaceholderText("Search by name or phone"),
      "Zed",
    );

    expect(
      screen.getByRole("button", { name: "Add “Zed” as a new client" }),
    ).toBeInTheDocument();
  });

  it("books a client through service, time and protection", async () => {
    await openNewBooking();

    // Home lists Nia too; the sheet comes last
    await user.click(
      screen
        .getAllByRole("button", { name: /^Nia Okafor/ })
        .at(-1) as HTMLElement,
    );

    // picking a client moves straight to the service list
    await user.click(screen.getByRole("button", { name: /^Knotless braids/ }));
    expect(screen.getByText("Selected service")).toBeInTheDocument();
    await user.click(getContinue());
    expect(screen.getByText("When?")).toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: /^Tue/ })[0] as HTMLElement,
    );

    await user.click(
      screen
        .getAllByRole("button", { name: /^\d\d:\d\d$/ })
        .at(-1) as HTMLElement,
    );

    await user.click(getContinue());
    expect(screen.getByText("Booking protection")).toBeInTheDocument();
    await user.click(getContinue());
    expect(screen.getByText("Anything else?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    expect(
      screen.getByText("Booking added for Nia. Payment link sent"),
    ).toBeInTheDocument();
  });

  it("a walk-in skips booking protection", async () => {
    await openNewBooking();

    await user.click(
      screen.getByRole("button", { name: "No client, this is a walk-in" }),
    );

    await user.click(screen.getByRole("button", { name: /^Knotless braids/ }));
    await user.click(getContinue());

    await user.click(
      screen.getAllByRole("button", { name: /^Tue/ })[0] as HTMLElement,
    );

    await user.click(
      screen
        .getAllByRole("button", { name: /^\d\d:\d\d$/ })
        .at(-1) as HTMLElement,
    );

    await user.click(getContinue());
    expect(screen.getByText("Anything else?")).toBeInTheDocument();
  });
});
