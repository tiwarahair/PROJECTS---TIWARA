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

/** Opens Bookings → List → Past and the row whose text matches. */
const openPast = async (match: RegExp) => {
  renderWithStore(<StudioPage />, "/studio?fixture=cal-day");
  runNextTimer();
  await user.click(screen.getByRole("button", { name: "List" }));
  await user.click(screen.getByRole("button", { name: "Past" }));

  await user.click(
    screen.getAllByRole("button", { name: match })[0] as HTMLElement,
  );

  advance(400);
};

describe("Studio → past booking sheet", () => {
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

  it("a completed booking shows what was paid and the receipt links", async () => {
    await openPast(/Nia Okafor.*Completed/);
    // the past list behind the sheet shows the same labels
    expect(screen.getAllByText("£85").length).toBeGreaterThan(1);

    expect(
      screen.getByRole("button", { name: "View receipt" }),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Refund" })).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Book again" }),
    ).toBeInTheDocument();
  });

  it("an unpaid no-show fee can be waived", async () => {
    await openPast(/Amara Osei.*No show/);

    expect(
      screen.getByText("Card declined: insufficient funds"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Waive fee" }));

    await user.click(
      screen
        .getAllByRole("button", { name: "Waive fee" })
        .at(-1) as HTMLElement,
    );

    expect(screen.getAllByText("Fee waived").length).toBeGreaterThan(0);

    expect(
      screen.queryByText("Card declined: insufficient funds"),
    ).not.toBeInTheDocument();
  });

  it("a fresh cancellation fee shows as pending with a waive action", async () => {
    await openPast(/Yasmin Diallo.*Cancelled/);
    expect(screen.getAllByText("Fee pending").length).toBeGreaterThan(1);

    expect(
      screen.getByRole("button", { name: /^Waive £10.00 fee/ }),
    ).toBeInTheDocument();
  });
});
