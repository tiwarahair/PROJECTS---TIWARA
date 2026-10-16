// Booking's reads and writes: open times, holding a time, the mobile travel check.
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

/** A refusal from a booking function ("slot_taken", "rate_limited", …); anything else is "unknown". */
export class BookingError extends Error {}

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

export const holdBooking = async (request: HoldRequest) => {
  const { data, error } = await supabase.functions.invoke<HeldBooking>(
    "booking-hold",
    { body: request },
  );

  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => ({}))) as {
      error?: string;
    };

    throw new BookingError(body.error ?? "unknown");
  }

  if (error || !data) throw new BookingError("unknown");

  return data;
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
