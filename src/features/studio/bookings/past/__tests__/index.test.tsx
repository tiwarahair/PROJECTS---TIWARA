import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../../test/render-with-store";
import { getRow } from "../../../../../test/studio-booking-row";
import { getStudioSeed } from "../../../../../test/studio-seed";
import type { StudioBookingRow } from "../../../../../lib/studio-api/bookings";
import { StudioPage } from "../../..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../../../test/setup-user";

vi.mock("../../../../../lib/studio-api/money", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../../lib/studio-api/money")
  >()),
  waiveFee: vi.fn(() => Promise.resolve()),
  retryFee: vi.fn(() => new Promise(() => {})),
}));

let user: UserEvent;

type FeeRow = StudioBookingRow["booking_fees"][number];

const getFee = (patch: Partial<FeeRow>): FeeRow => ({
  id: "fee-1",
  kind: "no_show",
  status: "pending",
  amount_pence: 1000,
  kept_pence: 1000,
  refund_pence: 0,
  charge_pence: 0,
  tries: 0,
  hard_decline: false,
  decline_message: null,
  card_label: null,
  waived_at: null,
  created_at: "2026-09-06T12:00:00Z",
  failed_runs: 0,
  ...patch,
});

const getPastRow = (
  id: string,
  day: number,
  patch: Partial<StudioBookingRow>,
) => {
  const startsAt = `2026-09-0${day}T09:00:00+00:00`;

  return getRow({ id, starts_at: startsAt, past_at: startsAt, ...patch });
};

const PAST_ROWS = [
  getPastRow("b-done", 1, {
    status: "completed",
    checkout: { method: "card" },
    payments: [
      {
        id: "p-1",
        kind: "booking",
        method: "card",
        amount_pence: 1448,
        platform_fee_pence: 148,
        tip_pence: 0,
        created_at: "2026-08-20T10:00:00+00:00",
      },
      {
        id: "p-2",
        kind: "balance",
        method: "card",
        amount_pence: 5200,
        platform_fee_pence: 0,
        tip_pence: 0,
        created_at: "2026-09-01T10:30:00+00:00",
      },
    ],
  }),
  getPastRow("b-noshow", 3, {
    status: "no_show",
    no_show_at: "2026-09-03T10:00:00+00:00",
    booking_fees: [
      getFee({
        status: "unpaid",
        amount_pence: 5200,
        kept_pence: 0,
        charge_pence: 5200,
        tries: 1,
        card_label: "Visa •••• 4242",
      }),
    ],
  }),
  getPastRow("b-cancelled", 6, {
    status: "cancelled",
    cancelled_at: "2026-09-06T08:00:00+00:00",
    cancelled_by: "client",
    booking_fees: [getFee({ kind: "late_cancel" })],
  }),
];

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
  const seed = getStudioSeed();

  seed.bookings.past = PAST_ROWS;
  renderWithStore(<StudioPage seed={seed} />, "/studio");
  runNextTimer();
  await user.click(screen.getByRole("button", { name: "Bookings" }));
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
    expect(screen.getAllByText("£65").length).toBeGreaterThan(1);

    expect(
      screen.getByRole("button", { name: "View receipt" }),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Refund" })).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Book again" }),
    ).toBeInTheDocument();
  });

  it("an unpaid no-show fee can be waived", async () => {
    await openPast(/Nia Okafor.*No show/);

    expect(screen.getByText("Card declined")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Waive fee" }));

    await user.click(
      screen
        .getAllByRole("button", { name: "Waive fee" })
        .at(-1) as HTMLElement,
    );

    expect(screen.getAllByText("Fee waived").length).toBeGreaterThan(0);

    expect(screen.queryByText("Card declined")).not.toBeInTheDocument();
  });

  it("retrying the card keeps the button off until the charge settles", async () => {
    await openPast(/Nia Okafor.*No show/);
    await user.click(screen.getByRole("button", { name: /^Retry card/ }));
    await user.click(screen.getByRole("button", { name: /^Charge £/ }));

    expect(screen.getByRole("button", { name: /^Retry card/ })).toBeDisabled();
  });

  it("a cancellation fee shows as pending with a waive action", async () => {
    await openPast(/Nia Okafor.*Cancelled/);
    expect(screen.getAllByText("Fee pending").length).toBeGreaterThan(1);

    expect(
      screen.getByRole("button", { name: /^Waive £10.00 fee/ }),
    ).toBeInTheDocument();
  });
});
