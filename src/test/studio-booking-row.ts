import type { StudioBookingRow } from "../lib/studio-api/bookings";
import { fromLondonTime } from "../utils/london-time";
import { toDate } from "../features/studio/core/blocked-time";

/** A Studio booking row as the database returns it: Nia, two days from now at 14:30, deposit paid. */
export const getRow = (patch: Partial<StudioBookingRow>): StudioBookingRow => ({
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
  created_by: "client",
  past_at: null,
  booking_fees: [],
  refunds: [],
  payment_links: [],
  ...patch,
});
