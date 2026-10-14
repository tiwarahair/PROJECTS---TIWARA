import {
  AuthApiError,
  AuthRetryableFetchError,
  FunctionsFetchError,
  FunctionsHttpError,
} from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { AUTH_FAILURE_MESSAGES, getAuthFailure } from "../auth-errors";

const authError = (status: number, code?: string) =>
  new AuthApiError("failed", status, code);

const functionError = (status: number) =>
  new FunctionsHttpError(new Response(null, { status }));

describe("getAuthFailure", () => {
  it.each([
    ["email-status 429", functionError(429), "rateLimited"],
    [
      "over_request_rate_limit",
      authError(429, "over_request_rate_limit"),
      "rateLimited",
    ],
    ["a 429 with no code", authError(429), "rateLimited"],
    [
      "a retryable 429",
      new AuthRetryableFetchError("Too Many Requests", 429),
      "rateLimited",
    ],
    [
      "over_email_send_rate_limit",
      authError(429, "over_email_send_rate_limit"),
      "emailLimit",
    ],
    ["email-status 403", functionError(403), "botCheck"],
    ["captcha_failed", authError(400, "captcha_failed"), "botCheck"],
    [
      "a retryable fetch failure",
      new AuthRetryableFetchError("Failed to fetch", 0),
      "network",
    ],
    [
      "a functions fetch failure",
      new FunctionsFetchError(new TypeError("Failed to fetch")),
      "network",
    ],
    ["a bare fetch TypeError", new TypeError("Failed to fetch"), "network"],
    ["an email-status 500", functionError(500), "unknown"],
    [
      "an unexpected auth error",
      authError(500, "unexpected_failure"),
      "unknown",
    ],
    ["anything else", new Error("boom"), "unknown"],
  ])("%s is %s", (_name, error, failure) => {
    expect(getAuthFailure(error)).toBe(failure);
  });

  it("has a message for every kind, with no dashes as separators", () => {
    for (const message of Object.values(AUTH_FAILURE_MESSAGES))
      expect(message).not.toMatch(/[—–]/);
  });
});
