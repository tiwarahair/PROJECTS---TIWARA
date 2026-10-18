import { describe, expect, it } from "vitest";
import type { StudioBookingRow } from "../../../../lib/studio-api";
import { fromLondonTime } from "../../../../utils/london-time";
import { toDate } from "../../core/blocked-time";
import { toStartsAt, toStudioBookings } from "../records";

const getRow = (patch: Partial<StudioBookingRow>): StudioBookingRow => ({
  id: "b-1",
  status: "confirmed",
  starts_at: fromLondonTime(toDate(2), "14:30"),
  minutes: 90,
  price_pence: 6500,
  snapshot: { service_name: "Silk press" },
  contact: {
    first: "Nia",
    last: "Okafor",
    email: "Nia@Example.com",
    phone: "07700900123",
  },
  notes: null,
  address: null,
  terms: {
    mode: "deposit",
    grace_minutes: 15,
    free_cancel_until: "2026-10-18T10:00:00+00:00",
  },
  reschedule_count: 0,
  cancelled_at: null,
  cancelled_by: null,
  cancellation: null,
  no_show_at: null,
  overlap_ok: false,
  booking_fees: [],
  refunds: [],
  payment_links: [],
  ...patch,
});

describe("toStudioBookings", () => {
  it("shows an upcoming booking on its UK day and time", () => {
    const {
      bookings: [booking],
    } = toStudioBookings([getRow({})]);

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
    const first = toStudioBookings([getRow({ id: "b-2" })]).bookings[0]?.id;

    const second = toStudioBookings([
      getRow({ id: "b-3" }),
      getRow({ id: "b-2" }),
    ]).bookings;

    expect(second[1]?.id).toBe(first);
    expect(second[0]?.id).not.toBe(first);
  });

  it("puts finished bookings in Past, latest change first", () => {
    const { bookings, pastNew } = toStudioBookings([
      getRow({
        id: "b-4",
        status: "cancelled",
        cancelled_by: "stylist",
        cancelled_at: new Date(Date.now() - 3600000).toISOString(),
        refunds: [{ amount_pence: 1463 }],
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

  it("lists each client once, from their booking details", () => {
    const { bookings, bookingClients } = toStudioBookings([
      getRow({ id: "b-6" }),
      getRow({ id: "b-7" }),
    ]);

    expect(bookingClients).toEqual([
      {
        id: "contact:nia@example.com",
        name: "Nia Okafor",
        first: "Nia",
        phone: "07700900123",
        email: "Nia@Example.com",
      },
    ]);

    expect(bookings[0]?.client).toBe("contact:nia@example.com");
  });

  it("saves a moved booking at the time Studio shows", () => {
    const [booking] = toStudioBookings([
      getRow({ id: "b-8", starts_at: toStartsAt(3, "09:00") }),
    ]).bookings;

    expect(booking).toMatchObject({ dayOffset: 3, time: "09:00" });
  });
});
