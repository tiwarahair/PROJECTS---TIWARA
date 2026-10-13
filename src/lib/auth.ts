// Every Supabase Auth call the log in / sign-up screens make; one seam for tests to stub.
import type { AuthError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AccountKind = "customer" | "stylist" | "none";

/** Version of the Client / Partner Terms a new account accepts. */
export const TERMS_VERSION = "2026-10";

interface PersonDetails {
  first: string;
  last: string;
  mobile: string;
  marketing: boolean;
}

export interface StylistDetails extends PersonDetails {
  businessName: string;
  businessType: "shop" | "chair_rental" | "home_based" | "mobile";
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  lat: number;
  lng: number;
  areaLabel: string | null;
  travelRadiusMiles: number | null;
  categories: string[];
  contactEmail: string | null;
  contactPhone: string | null;
  referralSource: string;
}

/** Thrown for failures the screens show as a connection problem. */
export class AuthRequestError extends Error {}

const getRedirect = (flow: string) =>
  `${window.location.origin}/login?flow=${flow}`;

const getPersonMetadata = ({
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

/** Returns the error code for expected failures; throws for the rest. */
const getErrorCode = (error: AuthError | null, expected: string[]) => {
  if (!error) return null;

  if (error.code && expected.includes(error.code)) return error.code;

  throw new AuthRequestError(error.message);
};

export const getAccountKind = async (email: string, captchaToken: string) => {
  const { data, error } = await supabase.functions.invoke<{
    kind: AccountKind;
  }>("email-status", { body: { email, captchaToken } });

  if (error || !data) throw new AuthRequestError("email-status failed");

  return data.kind;
};

export const signIn = async (
  email: string,
  password: string,
  captchaToken: string,
) => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  });

  return getErrorCode(error, ["invalid_credentials", "email_not_confirmed"]);
};

/** False when the email already has an account (Supabase hides this behind an empty identity list). */
const signUp = async (
  email: string,
  password: string,
  captchaToken: string,
  data: object,
) => {
  const { data: result, error } = await supabase.auth.signUp({
    email,
    password,
    options: { captchaToken, data },
  });

  getErrorCode(error, []);

  return (result.user?.identities?.length ?? 0) > 0;
};

export const signUpClient = (
  email: string,
  password: string,
  captchaToken: string,
  details: PersonDetails,
) =>
  signUp(email, password, captchaToken, {
    account_type: "client",
    ...getPersonMetadata(details),
  });

export const signUpStylist = (
  email: string,
  password: string,
  captchaToken: string,
  details: StylistDetails,
) =>
  signUp(email, password, captchaToken, {
    account_type: "stylist",
    ...getPersonMetadata(details),
    stylist: {
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
    },
  });

/** True when the 6-digit code confirmed the email (and signed the user in). */
export const verifyEmailCode = async (email: string, code: string) => {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });

  return !getErrorCode(error, ["otp_expired"]);
};

export const resendEmailCode = async (email: string, captchaToken: string) => {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { captchaToken },
  });

  getErrorCode(error, []);
};

export const sendPasswordReset = async (
  email: string,
  captchaToken: string,
) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    captchaToken,
    redirectTo: getRedirect("reset"),
  });

  getErrorCode(error, []);
};

export const setNewPassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({ password });

  return getErrorCode(error, ["same_password", "weak_password"]);
};

export const startGoogleSignIn = async (isPro: boolean) => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: getRedirect(isPro ? "social-pro" : "social") },
  });

  getErrorCode(error, []);
};

/** True when the account has 2FA set up but this session hasn't passed it yet. */
export const needsSecondFactor = async () => {
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  getErrorCode(error, []);

  return data?.nextLevel === "aal2" && data.currentLevel !== "aal2";
};

/** Verifies a code from the main (or backup) authenticator app. */
export const verifySecondFactor = async (code: string, useBackup: boolean) => {
  const { data, error } = await supabase.auth.mfa.listFactors();

  getErrorCode(error, []);

  const factor = data?.totp[useBackup ? 1 : 0];

  if (!factor) return false;

  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code,
  });

  return !getErrorCode(verifyError, ["mfa_verification_failed"]);
};

/** The signed-in user after a Google redirect: are they a stylist, and have they finished their profile? */
export const getSignedInAccount = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, client_terms_version")
    .eq("id", user.id)
    .single();

  const [first = "", ...rest] = String(
    user.user_metadata.full_name ?? "",
  ).split(" ");

  return {
    email: user.email ?? "",
    isStylist: user.app_metadata.is_stylist === true,
    hasProfile: !!profile?.client_terms_version,
    first: profile?.first_name ?? first,
    last: profile?.last_name ?? rest.join(" "),
  };
};

/** Finishes a Google sign-up: names, mobile and the accepted Client Terms. */
export const completeClientProfile = async (details: PersonDetails) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metadata = getPersonMetadata(details);

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: metadata.first_name,
      last_name: metadata.last_name,
      phone: metadata.phone,
      marketing_opt_in: metadata.marketing,
      client_terms_version: TERMS_VERSION,
    })
    .eq("id", user?.id ?? "");

  if (error) throw new AuthRequestError(error.message);
};

export const signOut = () => supabase.auth.signOut();
