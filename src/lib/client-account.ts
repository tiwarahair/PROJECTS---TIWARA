import { invokeFunction } from "./invoke-function";
import { supabase } from "./supabase";

export interface DeletionBlockers {
  bookings: { ref: string; stylistName: string; startsAt: string }[];
  owesMoney: boolean;
  hasBusiness: boolean;
}

interface BlockersRow {
  bookings: { ref: string; stylist_name: string; starts_at: string }[];
  owes_money: boolean;
  has_business: boolean;
}

export const fetchDeletionBlockers = async (): Promise<DeletionBlockers> => {
  const { data, error } = await supabase.rpc("get_my_deletion_blockers");

  if (error) throw error;

  const {
    bookings,
    owes_money: owesMoney,
    has_business: hasBusiness,
  } = data as unknown as BlockersRow;

  return {
    bookings: bookings.map(
      ({ ref, stylist_name: stylistName, starts_at: startsAt }) => ({
        ref,
        stylistName,
        startsAt,
      }),
    ),
    owesMoney,
    hasBusiness,
  };
};

export const isDeletionBlocked = ({
  bookings,
  owesMoney,
  hasBusiness,
}: DeletionBlockers) => bookings.length > 0 || owesMoney || hasBusiness;

export const sendAccountCode = async () => {
  const { data, error } = await supabase.rpc("send_account_code");

  if (error) throw error;

  return data;
};

export const deleteClientAccount = (code?: string) =>
  invokeFunction<{ deleted: boolean }>(
    "client-delete-account",
    code ? { code } : {},
  );
