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
  code: string;
  next: string;
}

export const getPasswordSchema = (isCodeSent: boolean, profile: Profile) =>
  z.object({
    code: z
      .string()
      .refine(
        (value) => !isCodeSent || !!value,
        "Enter the code we emailed you",
      ),
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

export type FormAddress =
  | (AddressValue & {
      source?: string;
      lat?: number | null;
      lng?: number | null;
    })
  | null;

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
