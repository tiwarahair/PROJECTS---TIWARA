import { describe, expect, it } from "vitest";
import type { StudioState } from "../../core/types";
import type { DecoratedBooking } from "../decorate";
import { UPCOMING_FILTERS, getOptionLabel, isUpcomingMatch } from "../filters";
import { STATUS_OPTIONS } from "../types";

const asState = (fields: Partial<StudioState>) =>
  ({
    filterRange: "all",
    filterStatus: "all",
    filterPayment: "any",
    ...fields,
  }) as StudioState;

const booking = {
  dayOffset: 3,
  status: "confirmed",
  paid: "link",
} as DecoratedBooking;

describe("bookings → upcoming filters", () => {
  it("matches a booking against every filter", () => {
    expect(isUpcomingMatch(asState({}), booking)).toBe(true);

    expect(isUpcomingMatch(asState({ filterRange: "today" }), booking)).toBe(
      false,
    );

    expect(
      isUpcomingMatch(
        asState({ filterRange: "7", filterPayment: "unpaid" }),
        booking,
      ),
    ).toBe(true);

    expect(isUpcomingMatch(asState({ filterPayment: "full" }), booking)).toBe(
      false,
    );
  });

  it("tries another option for one filter, keeping the rest", () => {
    const [, statusFilter] = UPCOMING_FILTERS;
    const state = asState({ filterStatus: "arrived" });

    expect(isUpcomingMatch(state, booking)).toBe(false);

    expect(
      isUpcomingMatch(state, booking, {
        filter: statusFilter!,
        id: "confirmed",
      }),
    ).toBe(true);
  });

  it("labels an option by its id", () => {
    expect(getOptionLabel(STATUS_OPTIONS, "arrived")).toBe("Arrived");
    expect(getOptionLabel(STATUS_OPTIONS, "missing")).toBe("");
  });
});
