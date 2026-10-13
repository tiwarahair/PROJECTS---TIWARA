// A signed-in account changing itself: becoming a stylist, its login email and its password.
import type { StylistDetails } from "../types/auth";
import {
  checkEmailCode,
  getBusinessMetadata,
  getErrorCode,
  TERMS_VERSION,
} from "./auth-helpers";
import { supabase } from "./supabase";

/** Adds a business to the account; the refreshed session then carries is_stylist. */
export const becomeStylist = async (details: StylistDetails) => {
  const { error } = await supabase.rpc("become_stylist", {
    details: {
      terms_version: TERMS_VERSION,
      stylist: getBusinessMetadata(details),
    },
  });

  if (error) throw error;

  await supabase.auth.refreshSession();
};

/** Secure email change: Supabase emails a code to the current address and another to the new one. */
export const sendEmailChangeCodes = async (email: string) => {
  const { error } = await supabase.auth.updateUser({ email });

  return getErrorCode(error, ["email_exists", "over_email_send_rate_limit"]);
};

/** Confirms one of the two codes; the email changes once both are in. */
export const verifyEmailChangeCode = (email: string, code: string) =>
  checkEmailCode(email, code, "email_change");

/** Emails the code Supabase asks for when the last sign-in was over 24 hours ago. */
export const sendReauthenticationCode = async () => {
  const { error } = await supabase.auth.reauthenticate();

  getErrorCode(error, []);
};

/**
 * Sets a new password (with the emailed code when Supabase asks for one: `reauthentication_needed`),
 * then optionally signs out every other device.
 */
export const changePassword = async (
  password: string,
  code: string,
  signOutOthers: boolean,
) => {
  const { error } = await supabase.auth.updateUser({
    password,
    nonce: code || undefined,
  });

  const failure = getErrorCode(error, [
    "reauthentication_needed",
    "reauthentication_not_valid",
    "same_password",
    "weak_password",
  ]);

  if (!failure && signOutOthers)
    await supabase.auth.signOut({ scope: "others" });

  return failure;
};
