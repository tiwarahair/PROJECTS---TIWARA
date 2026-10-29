import { invokeFunction } from "./invoke-function";
import { supabase } from "./supabase";

export interface BookingChoices {
  variations: string[];
  addons: string[];
  colour?: string;
}

export interface SlotRequest {
  serviceId: string;
  choices: BookingChoices;
  from: string;
  to: string;
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
  allergies: string;
  clearAllergies: boolean;
  requireCvc: boolean;
  address?: {
    line1: string;
    line2: string;
    town: string;
    postcode: string;
    notes: string;
    lat: number;
    lng: number;
  };
  turnstileToken: string;
  agreement: string;
  policyLines: string[];
}

export interface BookingStatus {
  status: string;
  ref: string;
  starts_at: string;
  ends_at: string;
}

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
  invokeFunction<HeldBooking>("booking-hold", request);

export const startCheckout = (request: CheckoutRequest) =>
  invokeFunction<{ clientSecret: string }>("booking-checkout", request);

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
