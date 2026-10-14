// Shared by the auth modules: error handling, email codes and the metadata a new account carries.
import type { AuthError, EmailOtpType } from "@supabase/supabase-js";
import type { PersonDetails, StylistDetails } from "../types/auth";
import { supabase } from "./supabase";

/** Version of the Client / Partner Terms a new account accepts. */
export const TERMS_VERSION = "2026-10";

/** Returns the error code for expected failures; throws the rest as they came (see auth-errors.ts). */
export const getErrorCode = (error: AuthError | null, expected: string[]) => {
  if (!error) return null;

  if (error.code && expected.includes(error.code)) return error.code;

  throw error;
};

/** True when the 6-digit code matched. */
export const checkEmailCode = async (
  email: string,
  code: string,
  type: EmailOtpType,
) => {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type });

  return !getErrorCode(error, ["otp_expired"]);
};

export const getPersonMetadata = ({
  first,
  last,
  mobile,
  marketing,
}: PersonDetails) => ({
  first_name: first.trim(),
  last_name: last.trim(),
  phone: mobile.trim(),
  marketing,
  terms_version: TERMS_VERSION,
});

export const getBusinessMetadata = (details: StylistDetails) => ({
  business_name: details.businessName,
  business_type: details.businessType,
  line1: details.line1,
  line2: details.line2,
  city: details.city,
  postcode: details.postcode,
  lat: details.lat,
  lng: details.lng,
  area_label: details.areaLabel,
  travel_radius_miles: details.travelRadiusMiles,
  categories: details.categories,
  contact_email: details.contactEmail,
  contact_phone: details.contactPhone,
  referral_source: details.referralSource,
});
