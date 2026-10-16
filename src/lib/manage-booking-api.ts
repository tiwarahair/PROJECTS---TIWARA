import { invokeBookingFunction } from "./booking-api";
import { supabase } from "./supabase";

export interface CancellationTerms {
  is_late: boolean;
  refund_pence: number;
  kept_pence: number;
  charge_pence: number;
  free_cancel_until: string;
}

interface SnapshotItem {
  label?: string;
  name?: string;
}

export interface ManagedBooking {
  id: string;
  ref: string;
  status: string;
  snapshot: {
    service_name: string;
    options: SnapshotItem[];
    addons: SnapshotItem[];
    colour: string | null;
  };
  starts_at: string;
  ends_at: string;
  stylist_name: string;
  stylist_slug: string;
  is_mobile: boolean;
  where: string;
  price_pence: number;
  fee_pence: number;
  paid_pence: number;
  terms: {
    mode: "none" | "deposit" | "full" | "card";
    deposit_pence: number;
    free_cancel_until: string;
  };
  allergies: string | null;
  reschedule_count: number;
  calendar_key: string;
  is_verified: boolean;
  cancelled_at: string | null;
  can_cancel: boolean;
  can_reschedule: boolean;
  cancellation: CancellationTerms;
}

export interface RescheduleSlotsRequest {
  token: string;
  from: string;
  to: string;
}

export const getManagedBooking = async (token: string) => {
  const { data, error } = await supabase.rpc("get_managed_booking", { token });

  if (error) throw error;

  return data as unknown as ManagedBooking | null;
};

export const getRescheduleSlots = async ({
  token,
  from,
  to,
}: RescheduleSlotsRequest) => {
  const { data, error } = await supabase.rpc("get_reschedule_slots", {
    token,
    from_date: from,
    to_date: to,
  });

  if (error) throw error;

  return data;
};

export const rescheduleBooking = async ({
  token,
  startsAt,
}: {
  token: string;
  startsAt: string;
}) => {
  const { error } = await supabase.rpc("reschedule_managed_booking", {
    token,
    slot_start: startsAt,
  });

  if (error) throw error;
};

export const updateBookingAllergies = async ({
  token,
  allergies,
  consent,
}: {
  token: string;
  allergies: string;
  consent: boolean;
}) => {
  const { error } = await supabase.rpc("update_booking_allergies", {
    token,
    allergies,
    consent,
  });

  if (error) throw error;
};

export type CodeCheck =
  "verified" | "wrong_code" | "expired" | "too_many_attempts";

export const sendBookingCode = async (token: string) => {
  const { data, error } = await supabase.rpc("send_booking_code", { token });

  if (error) throw error;

  return data as unknown as { email: string; sent: boolean };
};

export const verifyBookingCode = async ({
  token,
  code,
}: {
  token: string;
  code: string;
}) => {
  const { data, error } = await supabase.rpc("verify_booking_code", {
    token,
    code,
  });

  if (error) throw error;

  return data as CodeCheck;
};

export const secureBookingLink = async (token: string) => {
  const { data, error } = await supabase.rpc("secure_booking_link", { token });

  if (error) throw error;

  return data as unknown as { email: string; stylist_name: string };
};

export const cancelBooking = (token: string) =>
  invokeBookingFunction<CancellationTerms>("booking-cancel", { token });

export const getCalendarFileUrl = (params: Record<string, string>) =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-calendar?${new URLSearchParams(params)}`;
