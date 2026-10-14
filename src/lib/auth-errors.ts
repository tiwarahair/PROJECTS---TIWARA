// What went wrong with a log in / sign-up call, as one of a few kinds the screens can explain.
import {
  FunctionsFetchError,
  FunctionsHttpError,
  isAuthError,
  isAuthRetryableFetchError,
} from "@supabase/supabase-js";

export type AuthFailure =
  "rateLimited" | "emailLimit" | "botCheck" | "network" | "unknown";

export const AUTH_FAILURE_MESSAGES: Record<AuthFailure, string> = {
  rateLimited: "Too many attempts. Please try again later.",
  emailLimit:
    "We’ve sent too many emails to this address. Please try again later.",
  botCheck: "We couldn’t confirm you’re human. Please try again.",
  network: "We can’t connect right now. Check your connection and try again.",
  unknown: "Something went wrong. Please try again.",
};

const getStatus = (error: unknown) => {
  if (error instanceof FunctionsHttpError)
    return error.context.status as number;

  return isAuthError(error) ? error.status : undefined;
};

export const getAuthFailure = (error: unknown): AuthFailure => {
  const status = getStatus(error);
  const code = isAuthError(error) ? error.code : undefined;

  if (code === "over_email_send_rate_limit") return "emailLimit";

  if (status === 429 || code === "over_request_rate_limit")
    return "rateLimited";

  if (code === "captcha_failed") return "botCheck";

  if (error instanceof FunctionsHttpError && status === 403) return "botCheck";

  if (
    isAuthRetryableFetchError(error) ||
    error instanceof FunctionsFetchError ||
    error instanceof TypeError
  )
    return "network";

  return "unknown";
};
