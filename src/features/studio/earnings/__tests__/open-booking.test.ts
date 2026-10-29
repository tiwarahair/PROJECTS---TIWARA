import { describe, expect, it, vi } from "vitest";
import { openBookingById } from "../../bookings/open-by-id";
import type { LedgerRow } from "../../../../lib/studio-api/earnings";
import type { StudioController } from "../../core/use-studio";
import { openLedgerBooking } from "../open-booking";

vi.mock("../../bookings/open-by-id", () => ({
  openBookingById: vi.fn(() => Promise.resolve()),
}));

const showToast = vi.fn();
const studio = { actions: { showToast } } as unknown as StudioController;

const lines = [
  { booking_id: "booking-1", booking_ref: "TH-ONE" },
  { booking_id: "booking-2", booking_ref: "TH-TWO" },
] as LedgerRow[];

describe("openLedgerBooking", () => {
  it("opens the booking the money line belongs to", () => {
    openLedgerBooking(studio, lines, "TH-TWO");

    expect(openBookingById).toHaveBeenCalledWith(studio, "booking-2");
    expect(showToast).not.toHaveBeenCalled();
  });

  it("says so when the booking isn't in the ledger", () => {
    openLedgerBooking(studio, lines, "TH-GONE");

    expect(showToast).toHaveBeenCalledWith("That booking couldn’t be opened.");
  });
});
