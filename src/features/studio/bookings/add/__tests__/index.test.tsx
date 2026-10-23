import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../../test/render-with-store";
import { getStudioSeed } from "../../../../../test/studio-seed";
import { StudioPage } from "../../..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../../../test/setup-user";

// the save stays in flight, so the screen keeps what was done
vi.mock(
  "../../../../../lib/studio-api/booking-writes",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../../../../lib/studio-api/booking-writes")
    >()),
    createStudioBooking: vi.fn(() => new Promise(() => {})),
  }),
);

vi.mock("../../../../../lib/studio-api/clients", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../../lib/studio-api/clients")
  >()),
  saveStylistClient: vi.fn(() => new Promise(() => {})),
}));

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
  renderWithStore(<StudioPage seed={getStudioSeed()} />, "/studio");
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
      screen.getByPlaceholderText("Search by name, phone or email"),
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
    await user.click(screen.getByRole("button", { name: /^Silk press/ }));
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

  it("a client with no email gets one added from the protection step, then carries on", async () => {
    await openNewBooking();

    await user.type(
      screen.getByPlaceholderText("Search by name, phone or email"),
      "Bisi Phone",
    );

    await user.click(
      screen.getByRole("button", { name: "Add “Bisi Phone” as a new client" }),
    );

    await user.type(screen.getByPlaceholderText("07700 900000"), "07700900777");
    await user.click(getContinue());
    await user.click(screen.getByRole("button", { name: /^Silk press/ }));
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

    const notice = "Bisi has no email yet. The link is sent by email.";

    expect(screen.getByText(notice)).toBeInTheDocument();
    expect(getContinue()).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: /^No protection for this booking/ }),
    );

    expect(screen.queryByText(notice)).not.toBeInTheDocument();
    expect(getContinue()).toBeEnabled();

    await user.click(
      screen.getByRole("button", { name: /^Send payment link/ }),
    );

    await user.click(screen.getByRole("button", { name: "Add email" }));
    advance(300);

    // closing the edit sheet goes back to the booking, not away from it
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByText(notice)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add email" }));
    advance(300);

    const email = screen.getByLabelText("Email");

    expect(email).toHaveFocus();
    await user.type(email, "bisi@example.com");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    // the form checks the fields before saving
    await act(() => Promise.resolve());
    advance(300);

    expect(screen.getByText("Booking protection")).toBeInTheDocument();
    expect(screen.queryByText(notice)).not.toBeInTheDocument();
    expect(getContinue()).toBeEnabled();
    expect(screen.getByText("Email added")).toBeInTheDocument();
  });

  it("a walk-in skips booking protection", async () => {
    await openNewBooking();

    await user.click(
      screen.getByRole("button", { name: "No client, this is a walk-in" }),
    );

    await user.click(screen.getByRole("button", { name: /^Silk press/ }));
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
