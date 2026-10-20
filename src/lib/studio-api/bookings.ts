// Studio's bookings: loading them (active ones, and Past a page at a time) and changing them.
import { notifyStudioWrite, SaveError } from "../studio-writes";
import { supabase } from "../supabase";
import { fetchStudioClients } from "./clients";
import { check, invokeStudio, write } from "./request";

const BOOKING_SELECT = `id, status, starts_at, minutes, buffer_minutes, price_pence, fee_pence, due_today_pence,
  service_id, snapshot, contact, notes, address, terms, reschedule_count, cancelled_at, cancelled_by, cancellation,
  no_show_at, overlap_ok, created_by, past_at, paid_at, stripe_payment_method_id, protection_status, confirm_by,
  confirm_sends, confirm_sent_at, created_at, booking_notes(note), stylist_client_id,
  stylist_client:stylist_clients(first, last, phone, email, deleted_at),
  final_price_pence, tip_pence, checkout, card_label, unpaid_at,
  payments(id, kind, method, amount_pence, platform_fee_pence, tip_pence, created_at),
  booking_fees(id, kind, status, amount_pence, kept_pence, refund_pence, charge_pence, tries, hard_decline,
    decline_message, card_label, waived_at, created_at, failed_runs),
  refunds(amount_pence, reason, method),
  payment_links(purpose, status, sent_count, amount_pence, created_at)`;

// a completed booking still to be paid is back in "Due for checkout" with the active ones
const ACTIVE_FILTER =
  "status.in.(awaiting_confirmation,confirmed,arrived),and(status.eq.completed,unpaid_at.not.is.null)";

const PAST_FILTER =
  "status.in.(cancelled,auto_cancelled,no_show),and(status.eq.completed,unpaid_at.is.null)";

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
    selectBookings(stylistId).or(ACTIVE_FILTER).order("starts_at"),
  )) ?? [];

/** A page of Past, newest first, after `cursor` when given. */
export const fetchPastBookings = async (
  stylistId: string,
  cursor?: PastCursor,
) => {
  const query = selectBookings(stylistId)
    .or(PAST_FILTER)
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

/** Studio's opening load: every active booking, the first page of Past and the clients. */
export const fetchStudioBookings = async (stylistId: string) => {
  const [active, past, clients] = await Promise.all([
    fetchActiveBookings(stylistId),
    fetchPastBookings(stylistId),
    fetchStudioClients(stylistId),
  ]);

  return { active, past: past.rows, pastCursor: past.cursor, clients };
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

  if (error?.message === "too_late_to_protect")
    throw new SaveError(
      "The client needs at least 2 hours to confirm. Pick a later time, or confirm it without protection first.",
    );

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
