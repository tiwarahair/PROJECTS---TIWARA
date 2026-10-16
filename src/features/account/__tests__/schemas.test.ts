import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { SEED_PROFILE } from "../data";
import { cardSchema, getEditSchema } from "../schemas";

const getMessages = (result: z.ZodSafeParseResult<unknown>) =>
  Object.fromEntries(
    (result.error?.issues ?? [])
      .reverse()
      .map(({ path, message }) => [String(path[0]), message]),
  );

describe("account schemas", () => {
  it("validates the personal details edits", () => {
    const check = (key: "name" | "email" | "mobile", draft = SEED_PROFILE) =>
      getMessages(getEditSchema(key, SEED_PROFILE.email).safeParse(draft));

    expect(check("name", { ...SEED_PROFILE, first: " " })).toEqual({
      first: "Enter your first name",
    });

    expect(check("email")).toEqual({ email: "That’s already your email" });

    expect(
      check("email", { ...SEED_PROFILE, email: "kemi.a@icloud.com" }),
    ).toEqual({ email: "This email is already used by another account" });

    expect(
      check("mobile", { ...SEED_PROFILE, mobile: "07700 900123" }),
    ).toEqual({});

    expect(check("mobile", { ...SEED_PROFILE, mobile: "0123" })).toEqual({
      mobile: "Enter a UK mobile number, like 07700 900123",
    });
  });

  it("validates card details", () => {
    const check = (number: string, expiry: string, cvc: string) =>
      getMessages(
        cardSchema.safeParse({ number, expiry, cvc, isDefault: false }),
      );

    expect(check("4242", "13", "1")).toEqual({
      number: "Enter your card number",
      expiry: "Enter the expiry date",
      cvc: "Enter the 3 or 4-digit code",
    });

    expect(check("4242424242424242", "0101", "123")).toEqual({
      expiry: "This card has expired",
    });
  });
});
