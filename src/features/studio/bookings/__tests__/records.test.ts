import { describe, expect, it } from "vitest";
import type { StudioBookingRow } from "../../../../lib/studio-api/bookings";
import { getClientRow, getRow } from "../../../../test/studio-booking-row";
import { toStartsAt, toStudioBookings } from "../records";

// the opening load: each row is sorted into upcoming or Past by its status
const load = (rows: StudioBookingRow[]) =>
  toStudioBookings({ active: rows, past: rows, pastCursor: null, clients: [] });

describe("toStudioBookings", () => {
  it("shows an upcoming booking on its UK day and time", () => {
    const {
      bookings: [booking],
    } = load([getRow({})]);

    expect(booking).toMatchObject({
      remoteId: "b-1",
      dayOffset: 2,
      time: "14:30",
      duration: "1h 30m",
      service: "Silk press",
      price: 65,
      status: "confirmed",
      paid: "deposit",
      agreedPolicy: expect.objectContaining({ mode: "deposit", grace: 15 }),
      freeCancelUntil: "2026-10-18T10:00:00+00:00",
      overlapOk: false,
    });
  });

  it("keeps a booking's number across loads", () => {
    const first = load([getRow({ id: "b-2" })]).bookings[0]?.id;

    const second = load([
      getRow({ id: "b-3" }),
      getRow({ id: "b-2" }),
    ]).bookings;

    expect(second[1]?.id).toBe(first);
    expect(second[0]?.id).not.toBe(first);
  });

  it("puts finished bookings in Past, latest change first", () => {
    const { bookings, pastNew } = load([
      getRow({
        id: "b-4",
        status: "cancelled",
        cancelled_by: "stylist",
        cancelled_at: new Date(Date.now() - 3600000).toISOString(),
        refunds: [
          { amount_pence: 1463, reason: "stylist_cancel", method: "card" },
        ],
      }),
      getRow({
        id: "b-5",
        status: "no_show",
        no_show_at: new Date().toISOString(),
      }),
    ]);

    expect(bookings).toHaveLength(0);

    expect(pastNew.map(({ status }) => status)).toEqual([
      "No show",
      "Cancelled",
    ]);

    expect(pastNew[1]).toMatchObject({
      meta: "Refunded",
      note: "Cancelled by you. £14.63 refunded.",
      refunded: 14.63,
    });

    expect(pastNew[0]?.remoteId).toBe("b-5");

    expect(pastNew[0]?.original).toMatchObject({
      remoteId: "b-5",
      status: "confirmed",
    });
  });

  it("shows a cancellation whose refund keeps failing as needing checking", () => {
    const cancelled = {
      status: "cancelled",
      cancelled_by: "client",
      cancelled_at: new Date().toISOString(),
    };

    const { pastNew } = load([
      getRow({
        id: "b-6",
        ...cancelled,
        cancellation: { refund_now_pence: 1400, refund_failures: 5 },
      }),
      getRow({
        id: "b-7",
        ...cancelled,
        cancellation: {
          refund_now_pence: 1400,
          refund_failures: 5,
          refund_done: true,
        },
      }),
    ]);

    expect(pastNew.find(({ remoteId }) => remoteId === "b-6")).toMatchObject({
      meta: "Checking refund",
      note: "Cancelled by Nia. We’re checking why the refund couldn’t go through. There’s nothing for you to do.",
    });

    expect(pastNew.find(({ remoteId }) => remoteId === "b-7")?.meta).toBe(
      "No charge",
    );
  });

  it("lists each client once, by their client record", () => {
    const { bookings, bookingClients } = load([
      getRow({ id: "b-6" }),
      getRow({ id: "b-7" }),
    ]);

    expect(bookingClients).toEqual([
      {
        id: "client-nia",
        name: "Nia Okafor",
        first: "Nia",
        phone: "07700900123",
        email: "nia@example.com",
        deleted: false,
      },
    ]);

    expect(bookings[0]?.client).toBe("client-nia");
  });

  it("prefers the client list, which has their totals", () => {
    const { bookingClients } = toStudioBookings({
      active: [getRow({})],
      past: [],
      pastCursor: null,
      clients: [getClientRow({})],
    });

    expect(bookingClients).toHaveLength(1);

    expect(bookingClients[0]).toMatchObject({
      id: "client-nia",
      visits: 3,
      spent: 120,
      money: { deposits: 30, fees: 10, refunds: 5 },
    });
  });

  it("saves a moved booking at the time Studio shows", () => {
    const [booking] = load([
      getRow({ id: "b-8", starts_at: toStartsAt(3, "09:00") }),
    ]).bookings;

    expect(booking).toMatchObject({ dayOffset: 3, time: "09:00" });
  });

  it("heads Past rows from another year with the year", () => {
    const { pastNew } = load([
      getRow({
        id: "old-1",
        status: "completed",
        starts_at: "2024-10-12T10:00:00Z",
        past_at: "2024-10-12T12:00:00Z",
      }),
      getRow({
        id: "new-1",
        status: "completed",
        starts_at: new Date().toISOString(),
        past_at: new Date().toISOString(),
      }),
    ]);

    expect(pastNew.map(({ pastId }) => pastId)).toEqual(["new-1", "old-1"]);
    expect(pastNew[1]?.month).toBe("October 2024");
    expect(pastNew[0]?.month).not.toMatch(/\d/);
  });
});
