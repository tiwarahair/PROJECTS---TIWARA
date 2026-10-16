import { TERMS_VERSION } from "./auth-helpers";
import { invokeBookingFunction } from "./booking-api";
import { supabase } from "./supabase";

export interface BookingInvite {
  state: "valid" | "expired" | "account_exists";
  first: string;
  last: string;
  email: string;
}

export const getBookingInvite = (token: string) =>
  invokeBookingFunction<BookingInvite>("booking-invite", {
    action: "view",
    token,
  });

export const renewBookingInvite = (token: string) =>
  invokeBookingFunction<{ email: string }>("booking-invite", {
    action: "renew",
    token,
  });

export const claimBookingInvite = ({
  token,
  password,
}: {
  token: string;
  password: string;
}) =>
  invokeBookingFunction<{ tokenHash: string }>("booking-invite", {
    action: "claim",
    token,
    password,
    termsVersion: TERMS_VERSION,
  });

export const signInWithInvite = async (tokenHash: string) => {
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (error) throw error;
};

export const getOwnerManageToken = async (ref: string) => {
  const { data, error } = await supabase.rpc("get_owner_manage_token", {
    ref,
  });

  if (error) throw error;

  return data;
};
