import { z } from "zod";
import type { AddressValue } from "../../types/address";
import { isAddressValid } from "../../utils/address";
import { checkPassword, getPasswordMin } from "../../utils/password";
import { isValidEmail, isValidMobile } from "../../utils/validation";
import type { Profile } from "./data";
import type { EditKey } from "./logic";

const profileSchema = z.object({
  first: z.string(),
  last: z.string(),
  email: z.string(),
  mobile: z.string(),
}) satisfies z.ZodType<Profile>;

export const getEditSchema = (key: EditKey, currentEmail: string) => {
  if (key === "name")
    return profileSchema.extend({
      first: z.string().trim().min(1, "Enter your first name"),
      last: z.string().trim().min(1, "Enter your last name"),
    });

  if (key === "email")
    return profileSchema.extend({
      email: z
        .string()
        .transform((value) => value.trim().toLowerCase())
        .refine(isValidEmail, "Enter an email address like name@example.com")
        .refine((value) => value !== currentEmail, "That’s already your email"),
    });

  return profileSchema.extend({
    mobile: z
      .string()
      .refine(isValidMobile, "Enter a UK mobile number, like 07700 900123"),
  });
};

export interface PasswordFormValues {
  current: string;
  next: string;
}

export const getPasswordSchema = (hasPassword: boolean, profile: Profile) =>
  z.object({
    current: z
      .string()
      .refine((value) => !hasPassword || !!value, "Enter your current password"),
    next: z.string().refine(
      (value) =>
        checkPassword(value, {
          min: getPasswordMin("client"),
          first: profile.first,
          last: profile.last,
          email: profile.email,
        }).valid,
    ),
  });

export interface CardFormValues {
  number: string;
  expiry: string;
  cvc: string;
  isDefault: boolean;
}

const isExpiryReal = (expiry: string) => {
  const month = Number(expiry.slice(0, 2));

  return expiry.length === 4 && month >= 1 && month <= 12;
};

const isExpiryCurrent = (expiry: string) => {
  const month = Number(expiry.slice(0, 2));
  const year = Number(expiry.slice(2, 4));
  const now = new Date();
  const currentYear = now.getFullYear() % 100;

  return (
    year > currentYear || (year === currentYear && month >= now.getMonth() + 1)
  );
};

const digitsOnly = (value: string) => value.replace(/\D/g, "");

export const cardSchema = z.object({
  number: z
    .string()
    .refine(
      (value) => digitsOnly(value).length >= 15,
      "Enter your card number",
    ),
  expiry: z
    .string()
    .refine((value) => isExpiryReal(digitsOnly(value)), "Enter the expiry date")
    .refine(
      (value) =>
        !isExpiryReal(digitsOnly(value)) || isExpiryCurrent(digitsOnly(value)),
      "This card has expired",
    ),
  cvc: z.string().regex(/^\d{3,4}$/, "Enter the 3 or 4-digit code"),
  isDefault: z.boolean(),
});

export type FormAddress = (AddressValue & { source?: string }) | null;

export interface AddressFormValues {
  label: string;
  address: FormAddress;
  isDefault: boolean;
}

export const addressSchema = z.object({
  label: z.string(),
  address: z
    .custom<FormAddress>()
    .refine((value) => isAddressValid(value), "Enter the address"),
  isDefault: z.boolean(),
});
