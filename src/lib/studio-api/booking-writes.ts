// Bookings the stylist makes or changes in Studio: new bookings, edits, the client, protection and the client's links.
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { writeOrRefuse } from "./request";

const REFUSALS: Record<string, string> = {
  slot_taken: "That time was just booked. Pick another time.",
  start_too_early: "Bookings can start from today onwards.",
  too_late_to_protect:
    "There isn’t time for the client to confirm: protection needs the start to be more than 2 hours away.",
  cannot_protect:
    "This booking can’t ask for protection. Check your payment policy and Stripe in Settings.",
  client_locked:
    "The client has already paid or saved a card. Cancel this booking and make a new one instead.",
  contact_required: "Add a phone number or an email for the client.",
  invalid_phone: "That phone number isn’t a UK mobile.",
  invalid_email: "That email address doesn’t look right.",
  resend_not_allowed: "No resends left. Copy the link and send it yourself.",
  link_not_available: "That link isn’t available for this booking any more.",
  no_email: "There’s no email address for this client.",
  edit_not_allowed: "This booking can’t be changed any more.",
  status_not_allowed: "This booking can’t be changed any more.",
  reschedule_not_allowed:
    "Only bookings still to come can move, and only to a time that hasn’t passed.",
  not_bookable: "That service isn’t active any more. Pick another service.",
  invalid_choices:
    "Those add-ons aren’t available any more. Remove them and try again.",
};

const send = <T>(
  request: PromiseLike<{ data: T; error: PostgrestError | null }>,
) => writeOrRefuse(request, REFUSALS);

export interface StudioAddonLine {
  id: string;
  pricePence: number;
  minutes: number;
  quantity: number;
}

export interface StudioBookingDraft {
  serviceId: string;
  addons: StudioAddonLine[];
  startsAt: string;
  minutes: number;
  extraMinutes: number;
  pricePence: number;
  allowOverlap: boolean;
}

export interface StudioContact {
  first: string;
  last: string;
  phone: string;
  email: string;
}

export interface NewStudioBooking extends StudioBookingDraft {
  contact: StudioContact | null;
  address: string;
  note: string;
  protect: boolean;
}

const toAddonArgs = ({ addons }: StudioBookingDraft) => ({
  choices: { variations: [], addons: addons.map(({ id }) => id) },
  addons: addons.map(({ id, pricePence, minutes, quantity }) => ({
    id,
    price_pence: pricePence,
    minutes,
    quantity,
  })),
});

export interface SavedStudioBooking {
  id: string;
}

export const createStudioBooking = async (booking: NewStudioBooking) =>
  (await send(
    supabase.rpc("create_studio_booking", {
      target_service: booking.serviceId,
      ...toAddonArgs(booking),
      slot_start: booking.startsAt,
      minutes: booking.minutes,
      extra_minutes: booking.extraMinutes,
      price_pence: booking.pricePence,
      contact: booking.contact ? { ...booking.contact } : null,
      address: booking.address ? { line1: booking.address } : null,
      stylist_note: booking.note,
      protect: booking.protect,
      allow_overlap: booking.allowOverlap,
      origin: window.location.origin,
    }),
  )) as unknown as SavedStudioBooking;

export const updateStudioBooking = (
  id: string,
  booking: StudioBookingDraft,
  priceReason: string,
) =>
  send(
    supabase.rpc("update_studio_booking", {
      target: id,
      target_service: booking.serviceId,
      ...toAddonArgs(booking),
      slot_start: booking.startsAt,
      minutes: booking.minutes,
      extra_minutes: booking.extraMinutes,
      price_pence: booking.pricePence,
      price_reason: priceReason,
      allow_overlap: booking.allowOverlap,
    }),
  );

/** A new client for the booking (null makes it a walk-in), asked to confirm when `protect`. */
export const changeBookingClient = (
  id: string,
  contact: StudioContact | null,
  protect: boolean,
) =>
  send(
    supabase.rpc("change_booking_client", {
      target: id,
      contact: contact ? { ...contact } : null,
      protect,
    }),
  );

export const confirmWithoutProtection = (id: string) =>
  send(supabase.rpc("confirm_without_protection", { target: id }));

export const resendConfirmLink = (id: string) =>
  send(supabase.rpc("resend_confirm_link", { target: id }));

export const reopenStudioBooking = (id: string) =>
  send(supabase.rpc("reopen_studio_booking", { target: id }));

/** A link to the client's confirm page, for the stylist to send themselves. */
export const getConfirmUrl = async (id: string) =>
  (await send(supabase.rpc("get_confirm_url", { target: id }))) ?? "";

/** The client's manage page; `email` also sends it to them. */
export const getManageUrl = async (id: string, email: boolean) =>
  (await send(supabase.rpc("get_manage_url", { target: id, send: email }))) ??
  "";

export interface ClientUnpaidFee {
  booking_id: string;
  amount_pence: number;
  kind: "late_cancel" | "no_show";
}

/** A fee the client owes this stylist (matched by email or phone), for the add-booking warning. */
export const getClientUnpaidFee = async (
  stylistId: string,
  email: string,
  phone: string,
) =>
  (await send(
    supabase.rpc("get_client_unpaid_fee", {
      target_stylist: stylistId,
      email,
      phone,
    }),
  )) as unknown as ClientUnpaidFee | null;

export const setStylistNote = (id: string, note: string) =>
  send(supabase.rpc("set_stylist_note", { target: id, note }));
