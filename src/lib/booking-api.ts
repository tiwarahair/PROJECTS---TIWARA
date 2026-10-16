// Booking's reads and writes: open times, holding a time, the mobile travel check, checkout and its status.
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/** The picks sent to the server: chosen option ids, add-on ids and (braids) the colour. */
export interface BookingChoices {
  variations: string[];
  addons: string[];
  colour?: string;
}

export interface SlotRequest {
  serviceId: string;
  choices: BookingChoices;
  /** London dates, "YYYY-MM-DD" */
  from: string;
  to: string;
  /** The client's hold: its own times stay in the list. */
  ownHold?: string;
}

export interface HoldRequest {
  serviceId: string;
  choices: BookingChoices;
  startsAt: string;
  location?: { lat: number; lng: number };
  hold?: { id: string; secret: string };
}

export interface HeldBooking {
  id: string;
  ref: string;
  secret: string;
  hold_expires_at: string;
  starts_at: string;
}

export interface CheckoutRequest {
  hold: { id: string; secret: string };
  contact: { first: string; last: string; email: string; phone: string };
  notes: string;
  address?: {
    line1: string;
    line2: string;
    town: string;
    postcode: string;
    notes: string;
    lat: number;
    lng: number;
  };
  /** A signed-in client asked to save the card for future bookings. */
  keepCard: boolean;
  turnstileToken: string;
}

export interface BookingStatus {
  status: string;
  ref: string;
  starts_at: string;
  ends_at: string;
}

/** A refusal from a booking function ("slot_taken", "rate_limited", …); anything else is "unknown". */
export class BookingError extends Error {}

/** Calls a booking Edge Function, turning its refusals into a BookingError. */
const invokeBookingFunction = async <T>(name: string, body: object) => {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });

  if (error instanceof FunctionsHttpError) {
    const response = (await error.context.json().catch(() => ({}))) as {
      error?: string;
    };

    throw new BookingError(response.error ?? "unknown");
  }

  if (error || !data) throw new BookingError("unknown");

  return data;
};

export const getAvailableSlots = async ({
  serviceId,
  choices,
  from,
  to,
  ownHold,
}: SlotRequest) => {
  const { data, error } = await supabase.rpc("get_available_slots", {
    target_service: serviceId,
    choices: { ...choices },
    from_date: from,
    to_date: to,
    own_hold: ownHold,
  });

  if (error) throw error;

  return data;
};

export const holdBooking = (request: HoldRequest) =>
  invokeBookingFunction<HeldBooking>("booking-hold", request);

export const startCheckout = (request: CheckoutRequest) =>
  invokeBookingFunction<{ clientSecret: string }>("booking-checkout", request);

export const getBookingStatus = async ({
  id,
  secret,
}: {
  id: string;
  secret: string;
}) => {
  const { data, error } = await supabase.rpc("get_booking_status", {
    target: id,
    secret,
  });

  if (error) throw error;

  return data as BookingStatus | null;
};

export const isInTravelArea = async ({
  serviceId,
  lat,
  lng,
}: {
  serviceId: string;
  lat: number;
  lng: number;
}) => {
  const { data, error } = await supabase.rpc("is_in_travel_area", {
    target_service: serviceId,
    lat,
    lng,
  });

  if (error) throw error;

  return data === true;
};
