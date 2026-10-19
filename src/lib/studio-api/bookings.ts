// Studio's bookings: loading them (active ones, and Past a page at a time) and changing them.
import { notifyStudioWrite, SaveError } from "../studio-writes";
import { supabase } from "../supabase";
import { check, invokeStudio, write } from "./request";

const BOOKING_SELECT = `id, status, starts_at, minutes, price_pence, snapshot, contact, notes, address, terms,
  reschedule_count, cancelled_at, cancelled_by, cancellation, no_show_at, overlap_ok, created_by, past_at,
  booking_fees(id, kind, status, amount_pence, kept_pence, refund_pence, charge_pence, tries, hard_decline,
    decline_message, card_label, waived_at, created_at, failed_runs),
  refunds(amount_pence),
  payment_links(status, sent_count)`;

const ACTIVE_STATUSES = ["awaiting_confirmation", "confirmed", "arrived"];
const PAST_STATUSES = ["completed", "cancelled", "auto_cancelled", "no_show"];
const PAST_PAGE_SIZE = 50;

export interface PastCursor {
  pastAt: string;
  id: string;
}

const selectBookings = (stylistId: string) =>
  supabase.from("bookings").select(BOOKING_SELECT).eq("stylist_id", stylistId);

/** Every booking still to happen or happening (anything still being paid for is left out). */
const fetchActiveBookings = async (stylistId: string) =>
  (await check(
    selectBookings(stylistId).in("status", ACTIVE_STATUSES).order("starts_at"),
  )) ?? [];

/** A page of Past, newest first, after `cursor` when given. */
export const fetchPastBookings = async (
  stylistId: string,
  cursor?: PastCursor,
) => {
  const query = selectBookings(stylistId)
    .in("status", PAST_STATUSES)
    .order("past_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAST_PAGE_SIZE + 1);

  const rows =
    (await check(
      cursor
        ? query.or(
            `past_at.lt."${cursor.pastAt}",and(past_at.eq."${cursor.pastAt}",id.lt.${cursor.id})`,
          )
        : query,
    )) ?? [];

  const page = rows.slice(0, PAST_PAGE_SIZE);
  const last = page.at(-1);

  return {
    rows: page,
    cursor:
      rows.length > PAST_PAGE_SIZE && last?.past_at
        ? { pastAt: last.past_at, id: last.id }
        : null,
  };
};

/** Studio's opening load: every active booking and the first page of Past. */
export const fetchStudioBookings = async (stylistId: string) => {
  const [active, past] = await Promise.all([
    fetchActiveBookings(stylistId),
    fetchPastBookings(stylistId),
  ]);

  return { active, past: past.rows, pastCursor: past.cursor };
};

export type StudioBookings = Awaited<ReturnType<typeof fetchStudioBookings>>;

/** One booking as Studio shows it, after a change to it (null once it's out of Studio's view). */
export const fetchStudioBooking = async (id: string) =>
  check(
    supabase.from("bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle(),
  );

export type StudioBookingRow = Awaited<
  ReturnType<typeof fetchActiveBookings>
>[number];

export const setBookingStatus = (id: string, status: "arrived" | "confirmed") =>
  write(
    supabase.rpc("set_booking_status", { target: id, next_status: status }),
  );

export const markNoShow = (id: string, isChargingFee: boolean) =>
  write(
    supabase.rpc("mark_no_show", { target: id, charge_fee: isChargingFee }),
  );

export const undoNoShow = (id: string) =>
  write(supabase.rpc("undo_no_show", { target: id }));

export const rescheduleStudioBooking = async (
  id: string,
  startsAt: string,
  allowOverlap: boolean,
) => {
  const { error } = await supabase.rpc("reschedule_studio_booking", {
    target: id,
    slot_start: startsAt,
    allow_overlap: allowOverlap,
  });

  if (error?.message === "slot_taken")
    throw new SaveError("That time was just booked. Pick another time.");

  if (error) throw error;

  notifyStudioWrite();
};

export interface StudioCancel {
  bookingId: string;
  who: "stylist" | "client";
  waiveFee: boolean;
  reason: string;
}

/** Cancels through the Edge Function, which refunds the client first. */
export const cancelStudioBooking = async (cancel: StudioCancel) => {
  await invokeStudio("studio-booking-cancel", cancel);
};
