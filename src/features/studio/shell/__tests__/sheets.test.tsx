import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../test/render-with-store";
import { getRow } from "../../../../test/studio-booking-row";
import { getStudioSeed } from "../../../../test/studio-seed";
import { fromLondonTime } from "../../../../utils/london-time";
import { toDate } from "../../core/blocked-time";
import { StudioPage } from "../..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../../test/setup-user";

const ACTIVITY_AT = "2026-09-07T07:00:00+00:00";

vi.mock("../../../../lib/studio-api/home", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/studio-api/home")>()),
  fetchStudioActivity: vi.fn(() =>
    Promise.resolve([
      {
        id: "activity-1",
        kind: "client_cancelled",
        at: ACTIVITY_AT,
        booking_id: null,
        client_first: "Nia",
        service: "Silk press",
        amount_pence: null,
        is_unread: true,
      },
      {
        id: "activity-2",
        kind: "payout_paid",
        at: ACTIVITY_AT,
        booking_id: null,
        client_first: null,
        service: null,
        amount_pence: 12000,
        is_unread: true,
      },
    ]),
  ),
  markActivitySeen: vi.fn(() => new Promise(() => {})),
}));

// saves stay in flight, so the screen keeps what was done
vi.mock("../../../../lib/studio-api/settings", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../lib/studio-api/settings")
  >()),
  saveBlock: vi.fn(() => new Promise(() => {})),
  saveClosedPeriod: vi.fn(() => new Promise(() => {})),
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

// Nia is booked at 13:00 today, when new blocked time starts
const renderStudio = () => {
  const seed = getStudioSeed();

  seed.bookings.active = [
    getRow({
      starts_at: fromLondonTime(toDate(0), "13:00"),
      created_at: "2026-09-01T10:00:00+00:00",
    }),
  ];

  renderWithStore(<StudioPage seed={seed} />, "/studio");
  runNextTimer();
};

const openAvailability = async () => {
  await user.click(within(getLabelled("Sidebar")).getByTitle("Settings"));

  await user.click(
    within(getLabelled("Settings nav")).getByRole("button", {
      name: "Availability",
    }),
  );
};

describe("Studio sheets", () => {
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

  it("notifications mark as read and deep-link into the studio", async () => {
    renderStudio();
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    // Home's activity feed shows it too
    expect(await screen.findAllByText("Booking cancelled")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Mark all read" }));
    expect(screen.getByText("All caught up")).toBeInTheDocument();

    // the sheet's rows come after Home's activity feed
    await user.click(
      screen
        .getAllByRole("button", { name: /^Payout sent/ })
        .at(-1) as HTMLElement,
    );

    advance(240);
    expect(getLabelled("Earnings")).toBeInTheDocument();
  });

  it("blocking time over a booking asks first, then adds it", async () => {
    renderStudio();
    await openAvailability();

    await user.click(
      screen.getAllByRole("button", { name: "Add" })[0] as HTMLElement,
    );

    expect(screen.getByText("Block time")).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("e.g. Lunch (optional)"),
      "Dentist",
    );

    await user.click(screen.getByRole("button", { name: "Block this time" }));
    expect(screen.getByText("This overlaps 1 booking")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Keep bookings and block" }),
    );

    await act(() => Promise.resolve());
    advance(1);
    expect(screen.getByText("Time blocked")).toBeInTheDocument();
    advance(220);
    expect(screen.getByText("Dentist")).toBeInTheDocument();
  });

  it("blocked time says why it can't end before it starts", async () => {
    renderStudio();
    await openAvailability();

    await user.click(
      screen.getAllByRole("button", { name: "Add" })[0] as HTMLElement,
    );

    const [start, end] = screen
      .getAllByRole<HTMLSelectElement>("combobox")
      .filter((select) =>
        [...select.options].some(({ value }) => value === "06:00"),
      );

    await user.selectOptions(start!, "15:00");
    await user.selectOptions(end!, "14:00");

    expect(
      await screen.findByText("The end time must be after the start time."),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Block this time" }),
    ).toBeDisabled();
  });

  it("a closed period needs both dates", async () => {
    renderStudio();
    await openAvailability();

    await user.click(
      screen.getAllByRole("button", { name: "Add" })[1] as HTMLElement,
    );

    const add = screen.getByRole("button", { name: "Add closed period" });

    await user.click(add);

    expect(await screen.findByText("Choose a start date.")).toBeInTheDocument();
    expect(screen.getByText("Choose an end date.")).toBeInTheDocument();

    const [from, to] =
      document.querySelectorAll<HTMLInputElement>('input[type="date"]');

    await user.type(from as HTMLInputElement, "2026-12-24");

    await waitFor(() =>
      expect(
        screen.queryByText("Choose a start date."),
      ).not.toBeInTheDocument(),
    );

    await user.click(add);
    expect(screen.getByText("Choose an end date.")).toBeInTheDocument();

    await user.type(to as HTMLInputElement, "2026-12-28");
    await user.click(add);

    expect(
      await screen.findByText("Closed period added. Online booking blocked"),
    ).toBeInTheDocument();

    advance(220);
    expect(screen.getByText("24 Dec to 28 Dec")).toBeInTheDocument();
  });

  it("a closed period can't end before it starts", async () => {
    renderStudio();
    await openAvailability();

    await user.click(
      screen.getAllByRole("button", { name: "Add" })[1] as HTMLElement,
    );

    const [from, to] =
      document.querySelectorAll<HTMLInputElement>('input[type="date"]');

    await user.type(from as HTMLInputElement, "2026-12-28");
    await user.type(to as HTMLInputElement, "2026-12-24");

    expect(
      await screen.findByText("The end date can’t be before the start date."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add closed period" }));

    expect(
      screen.queryByText("Closed period added. Online booking blocked"),
    ).not.toBeInTheDocument();
  });

  it("moving a closed period's start after its end flags the end date", async () => {
    renderStudio();
    await openAvailability();

    await user.click(
      screen.getAllByRole("button", { name: "Add" })[1] as HTMLElement,
    );

    const [from, to] =
      document.querySelectorAll<HTMLInputElement>('input[type="date"]');

    await user.type(from as HTMLInputElement, "2026-12-24");
    await user.type(to as HTMLInputElement, "2026-12-26");
    await user.clear(from as HTMLInputElement);
    await user.type(from as HTMLInputElement, "2026-12-28");

    expect(
      await screen.findByText("The end date can’t be before the start date."),
    ).toBeInTheDocument();
  });

  it("clearing a closed period's end date asks for one", async () => {
    renderStudio();
    await openAvailability();

    await user.click(
      screen.getAllByRole("button", { name: "Add" })[1] as HTMLElement,
    );

    const [, to] =
      document.querySelectorAll<HTMLInputElement>('input[type="date"]');

    await user.type(to as HTMLInputElement, "2026-12-28");
    await user.clear(to as HTMLInputElement);

    expect(await screen.findByText("Choose an end date.")).toBeInTheDocument();
  });

  it("picking only a start date doesn't ask for the end date yet", async () => {
    renderStudio();
    await openAvailability();

    await user.click(
      screen.getAllByRole("button", { name: "Add" })[1] as HTMLElement,
    );

    const [from] =
      document.querySelectorAll<HTMLInputElement>('input[type="date"]');

    await user.type(from as HTMLInputElement, "2026-12-24");

    expect(
      await screen
        .findByText("Choose an end date.", {}, { timeout: 500 })
        .catch(() => null),
    ).toBeNull();
  });

  it("editing a closed period saves rather than adds", async () => {
    renderStudio();
    await openAvailability();

    await user.click(
      screen.getAllByRole("button", { name: "Add" })[1] as HTMLElement,
    );

    const [from, to] =
      document.querySelectorAll<HTMLInputElement>('input[type="date"]');

    await user.type(from as HTMLInputElement, "2026-12-24");
    await user.type(to as HTMLInputElement, "2026-12-28");

    await user.click(screen.getByRole("button", { name: "Add closed period" }));
    advance(220);

    const row = (await screen.findByText("24 Dec to 28 Dec")).parentElement
      ?.parentElement as HTMLElement;

    await user.click(within(row).getByRole("button", { name: "Edit" }));

    expect(
      await screen.findByRole("button", { name: "Save closed period" }),
    ).toBeInTheDocument();
  });
});
