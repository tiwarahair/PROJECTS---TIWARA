// Log in and sign-up: every Supabase Auth call those screens make; one seam for tests to stub.
import type {
  PasswordPerson,
  PasswordProblem,
  PasswordRole,
} from "../../supabase/functions/_shared/password-rules";
import type { AccountKind, PersonDetails, StylistDetails } from "../types/auth";
import {
  checkEmailCode,
  getBusinessMetadata,
  getErrorCode,
  getPersonMetadata,
  TERMS_VERSION,
} from "./auth-helpers";
import { invokeFunction } from "./invoke-function";
import { supabase } from "./supabase";

export type NewPasswordProblem = PasswordProblem | "pwned";

interface PasswordAnswer {
  problem: NewPasswordProblem;
}

const getRedirect = (flow: string) =>
  `${window.location.origin}/login?flow=${flow}`;

export const getAccountKind = async (email: string, captchaToken: string) => {
  const { data, error } = await supabase.functions.invoke<{
    kind: AccountKind;
  }>("email-status", { body: { email, captchaToken } });

  if (error) throw error;

  if (!data) throw new Error("email-status returned nothing");

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
    stylist: getBusinessMetadata(details),
  });

/** True when the 6-digit code confirmed the email (and signed the user in). */
export const verifyEmailCode = (email: string, code: string) =>
  checkEmailCode(email, code, "email");

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

/**
 * The server's check of a new password
 */
export const checkNewPassword = async (
  password: string,
  who?: PasswordRole,
  { first, last, email }: PasswordPerson = {},
) => {
  try {
    const { problem } = await invokeFunction<PasswordAnswer>("check-password", {
      password,
      who,
      first,
      last,
      email,
    });

    return problem;
  } catch {
    return "";
  }
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

export const getSessionUser = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user ?? null;
};

export const isAdminSession = async () =>
  (await getSessionUser())?.app_metadata.is_admin === true;

export const getSessionAccount = async () => {
  const user = await getSessionUser();

  if (!user) return null;

  const { email = "", app_metadata: appMetadata } = user;

  return { email, isAdmin: appMetadata.is_admin === true };
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

  const { first_name, last_name, phone, marketing } =
    getPersonMetadata(details);

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name,
      last_name,
      phone,
      marketing_opt_in: marketing,
      client_terms_version: TERMS_VERSION,
    })
    .eq("id", user?.id ?? "");

  if (error) throw new Error(error.message);
};

export const signOut = () => supabase.auth.signOut({ scope: "local" });
