import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../../test/render-with-store";
import { getClientRow, getRow } from "../../../../../test/studio-booking-row";
import { getStudioSeed } from "../../../../../test/studio-seed";
import { fromLondonTime } from "../../../../../utils/london-time";
import { toDate } from "../../../core/blocked-time";
import { changeBookingClient } from "../../../../../lib/studio-api/booking-writes";
import { StudioPage } from "../../..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../../../test/setup-user";

// the save stays in flight, so the screen keeps what was done
vi.mock("../../../../../lib/studio-api/bookings", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../../lib/studio-api/bookings")
  >()),
  rescheduleStudioBooking: vi.fn(() => new Promise(() => {})),
  markNoShow: vi.fn(() => new Promise(() => {})),
}));

vi.mock(
  "../../../../../lib/studio-api/booking-writes",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../../../../lib/studio-api/booking-writes")
    >()),
    changeBookingClient: vi.fn(() => new Promise(() => {})),
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

const BOOKED_AT = "2026-09-01T10:00:00+00:00";

// Nia at 10:00 today, Ruth at 15:00
const getTodaySeed = () => {
  const seed = getStudioSeed();

  seed.bookings.active = [
    getRow({
      starts_at: fromLondonTime(toDate(0), "10:00"),
      created_at: BOOKED_AT,
    }),
    getRow({
      id: "b-2",
      starts_at: fromLondonTime(toDate(0), "15:00"),
      created_at: BOOKED_AT,
      stylist_client_id: "client-ruth",
      stylist_client: {
        first: "Ruth",
        last: "Mensah",
        phone: "07700900456",
        email: "ruth@example.com",
        deleted_at: null,
      },
    }),
  ];

  return seed;
};

const openBooking = async (name: string, seed = getTodaySeed()) => {
  renderWithStore(<StudioPage seed={seed} />, "/studio");
  runNextTimer();
  await user.click(screen.getByTitle("Bookings"));
  await user.click(within(getLabelled("Bookings")).getByText(name));
  advance(400);
};

const openNia = () => openBooking("Nia Okafor");

const openMoreItem = async (label: string) => {
  await user.click(
    screen
      .getAllByRole("button", { name: "More actions" })
      .at(-1) as HTMLElement,
  );

  await user.click(screen.getByRole("menuitem", { name: label }));
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

  it("a booking marked as a no-show stays on the day straight away", async () => {
    vi.setSystemTime(new Date(2026, 8, 7, 10, 30));
    await openNia();
    await openMoreItem("No-show");
    await user.click(screen.getByRole("button", { name: "Mark as no-show" }));
    advance(400);

    const bookings = getLabelled("Bookings");

    expect(within(bookings).getByText("Nia Okafor")).toBeInTheDocument();
    expect(within(bookings).getByText("No show")).toBeInTheDocument();
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

  it("a client with no email gets one added when changing the client, then is asked for protection", async () => {
    const seed = getTodaySeed();

    // nothing paid yet, so the client can change
    seed.bookings.active = seed.bookings.active.map((row) =>
      row.id === "b-2"
        ? {
            ...row,
            paid_at: null,
            stripe_payment_method_id: null,
            protection_status: "not_required",
          }
        : row,
    );

    seed.bookings.clients.push(
      getClientRow({
        id: "client-bisi",
        first: "Bisi",
        last: "Phone",
        phone: "07700900777",
        email: undefined,
      }),
    );

    await openBooking("Ruth Mensah", seed);
    await openMoreItem("Change client");
    await user.click(screen.getByRole("button", { name: /^Bisi Phone/ }));

    const title = screen.getByText("Bisi has no email yet");

    await user.click(title.parentElement?.previousElementSibling as Element);
    advance(300);
    expect(title).toBeInTheDocument();
    expect(changeBookingClient).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Add email" }));
    advance(300);

    // closing the edit sheet goes back to the booking, unchanged
    await user.click(screen.getByRole("button", { name: "Close" }));
    advance(300);
    expect(screen.getByRole("button", { name: /^Bisi Phone/ })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^Bisi Phone/ }));
    await user.click(screen.getByRole("button", { name: "Add email" }));
    advance(300);

    const email = screen.getByLabelText("Email");

    expect(email).toHaveFocus();
    await user.type(email, "bisi@example.com");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await act(() => Promise.resolve());
    advance(300);

    expect(screen.getByText("Email added")).toBeInTheDocument();

    expect(
      screen.getByText("Ask Bisi for booking protection?"),
    ).toBeInTheDocument();
  });
});
