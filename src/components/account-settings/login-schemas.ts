import { z } from "zod";
import { isValidEmail, isValidMobile } from "../../utils/validation";

const SIX_DIGITS = /^\d{6}$/;

export const getNewEmailSchema = (currentEmail: string) =>
  z.object({
    email: z
      .string()
      .transform((value) => value.trim().toLowerCase())
      .refine(isValidEmail, "Enter an email address, like name@example.co.uk.")
      .refine(
        (value) => value !== currentEmail.toLowerCase(),
        "That’s already your login email.",
      ),
  });

export const getEmailCodesSchema = (isCurrentConfirmed: boolean) =>
  z
    .object({ current: z.string(), next: z.string() })
    .refine(
      ({ current, next }) =>
        SIX_DIGITS.test(next) &&
        (isCurrentConfirmed || SIX_DIGITS.test(current)),
      { path: ["next"], message: "Enter both 6-digit codes." },
    );

export const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .refine(isValidMobile, "Enter a UK mobile number, like 07700 900418."),
});

export interface NewEmailValues {
  email: string;
}

export interface EmailCodesValues {
  current: string;
  next: string;
}

export interface PhoneValues {
  phone: string;
}
