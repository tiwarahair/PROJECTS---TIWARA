import { describe, expect, it, vi } from "vitest";
import { getInitialStudioState } from "../../initial-state";
import type { StudioBooking } from "../../types";
import { createBookingActions } from "../bookings";
import type { StudioContext } from "../context";

const unsaved: StudioBooking = {
  id: 1,
  dayOffset: 0,
  time: "10:00",
  duration: "1h",
  client: null,
  service: "Silk press",
  price: 60,
  pending: false,
  status: "confirmed",
  paid: "none",
};

describe("booking actions", () => {
  it("a booking that is still saving changes at once and saves after it", () => {
    const state = { ...getInitialStudioState(), bookings: [unsaved] };
    const setState = vi.fn();
    const save = vi.fn();
    const showToast = vi.fn();

    const context = {
      getState: () => state,
      setState,
      sync: { stylistId: "stylist-1", save },
      memo: {},
    } as unknown as StudioContext;

    const { setStatus } = createBookingActions(context, {
      showToast,
      openSheet: vi.fn(),
      closeSheet: vi.fn(),
    });

    setStatus(unsaved.id, "arrived", "Marked as arrived");

    expect(showToast).toHaveBeenCalledWith(
      "Marked as arrived",
      expect.any(Function),
    );

    expect(setState).toHaveBeenCalledWith({
      bookings: [{ ...unsaved, status: "arrived" }],
    });

    expect(save).toHaveBeenCalledTimes(1);
  });
});
