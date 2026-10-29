import { describe, expect, it } from "vitest";
import { getClientRow, getRow } from "../../../../test/studio-booking-row";
import { mergeBookingRows, mergeClientRows } from "../live-records";
import { toStudioClient } from "../../clients/records";

const empty = { bookings: [], pastNew: [], bookingClients: [] };

describe("mergeBookingRows", () => {
  it("adds a new booking and its client", () => {
    const merged = mergeBookingRows(empty, [getRow({ id: "live-1" })]);

    expect(merged.bookings.map(({ remoteId }) => remoteId)).toEqual(["live-1"]);

    expect(merged.bookingClients.map(({ name }) => name)).toEqual([
      "Nia Okafor",
    ]);
  });

  it("updates a booking in place, keeping its number", () => {
    const first = mergeBookingRows(empty, [getRow({ id: "live-2" })]);

    const moved = mergeBookingRows(first, [
      getRow({ id: "live-2", reschedule_count: 1 }),
    ]);

    expect(moved.bookings).toHaveLength(1);
    expect(moved.bookings[0]?.id).toBe(first.bookings[0]?.id);
    expect(moved.bookings[0]?.movedByClient).toBe(true);
  });

  it("moves a cancelled booking to Past", () => {
    const first = mergeBookingRows(empty, [getRow({ id: "live-3" })]);

    const cancelled = mergeBookingRows(first, [
      getRow({
        id: "live-3",
        status: "cancelled",
        cancelled_by: "client",
        cancelled_at: new Date().toISOString(),
      }),
    ]);

    expect(cancelled.bookings).toHaveLength(0);
    expect(cancelled.pastNew.map(({ pastId }) => pastId)).toEqual(["live-3"]);
  });

  it("ignores a booking still being paid for", () => {
    expect(mergeBookingRows(empty, [getRow({ status: "held" })])).toEqual(
      empty,
    );
  });

  it("adds an older page of Past after what's shown, without doubling", () => {
    const shown = mergeBookingRows(empty, [
      getRow({
        id: "past-1",
        status: "completed",
        starts_at: "2026-10-10T10:00:00Z",
      }),
    ]);

    const older = mergeBookingRows(shown, [
      getRow({
        id: "past-1",
        status: "completed",
        starts_at: "2026-10-10T10:00:00Z",
      }),
      getRow({
        id: "past-2",
        status: "completed",
        starts_at: "2026-09-10T10:00:00Z",
      }),
    ]);

    expect(older.pastNew.map(({ pastId }) => pastId)).toEqual([
      "past-1",
      "past-2",
    ]);
  });
});

describe("mergeClientRows", () => {
  it("replaces a client with the fresh row, so a finished visit is counted", () => {
    const before = toStudioClient(getClientRow({ visits: 0 }));

    const merged = mergeClientRows(
      { bookingClients: [before], extraClients: [] },
      [getClientRow({ visits: 1 })],
    );

    expect(merged.bookingClients.map(({ visits }) => visits)).toEqual([1]);
  });

  it("keeps clients the list doesn't return and drops this visit's stand-in", () => {
    const walkIn = { id: "booking:b-9", name: "Walk-in", first: "Walk-in" };
    const added = { ...toStudioClient(getClientRow({})), visits: 0 };

    const merged = mergeClientRows(
      { bookingClients: [walkIn], extraClients: [added] },
      [getClientRow({ visits: 2 })],
    );

    expect(merged.bookingClients.map(({ id }) => id)).toEqual([
      "client-nia",
      "booking:b-9",
    ]);

    expect(merged.extraClients).toEqual([]);
  });
});
