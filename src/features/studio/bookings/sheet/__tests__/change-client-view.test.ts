import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { changeBookingClient } from "../../../../../lib/studio-api/booking-writes";
import type { StudioClient } from "../../../core/types";
import { getChangeClientView } from "../change-client-view";
import type { SheetContext } from "../context";

vi.mock("../../../../../lib/studio-api/booking-writes", () => ({
  changeBookingClient: vi.fn(),
}));

const added: StudioClient = {
  id: "c1",
  name: "Ada Lovelace",
  first: "Ada",
  phone: "07700900123",
  email: "",
};

const getContext = () => {
  const setState = vi.fn();
  const memo: SheetContext["memo"] = {};

  const saveBooking = vi.fn(
    (_patch: unknown, write: (remoteId: string) => unknown) => write("b1"),
  );

  const context = {
    state: {
      changeClientQuery: "",
      bookingClients: [],
      extraClients: [],
      clientOverrides: {},
      policy: { mode: "card" },
    },
    setState,
    actions: { openSheet: vi.fn() },
    memo,
    booking: { id: "b1", dayOffset: 3, time: "10:00" },
    hoursToStart: 72,
    saveBooking,
  } as unknown as SheetContext;

  getChangeClientView(context);

  return { memo, setState };
};

describe("change client → a client added just now", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("asks about protection for them, though they aren't in state yet", () => {
    const { memo, setState } = getContext();

    memo.setChangeClient?.("c1", added);

    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({
        confirm: expect.objectContaining({ title: "Ada has no email yet" }),
      }),
    );
  });

  it("changes the booking to their name and phone without protection", () => {
    const { memo, setState } = getContext();

    memo.setChangeClient?.("c1", added);

    const { confirm } = setState.mock.calls[0]?.[0] ?? {};

    confirm?.onNo();
    vi.advanceTimersByTime(200);

    expect(changeBookingClient).toHaveBeenCalledWith(
      "b1",
      { first: "Ada", last: "Lovelace", phone: "07700900123", email: "" },
      false,
    );
  });
});
