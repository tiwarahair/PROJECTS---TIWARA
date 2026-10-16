import { z } from "zod";
import { checkPassword } from "../../utils/password";
import type { PasswordCheckOptions } from "../../utils/password";

export interface PasswordValues {
  /** `code` is the one emailed to confirm it's them. */
  code: string;
  next: string;
  confirm: string;
}

export const EMPTY_PASSWORD: PasswordValues = {
  code: "",
  next: "",
  confirm: "",
};

/** ?pwnew= prefills the new password (and the current one) for the meter boards. */
export const getInitialPassword = (search: string): PasswordValues => {
  const prefilled = new URLSearchParams(search).get("pwnew") || "";

  return { code: prefilled ? "123456" : "", next: prefilled, confirm: "" };
};

export const getPasswordSchema = (
  isCodeSent: boolean,
  checkOptions: PasswordCheckOptions,
) =>
  z
    .object({ code: z.string(), next: z.string(), confirm: z.string() })
    .superRefine(({ code, next, confirm }, context) => {
      const flag = (path: keyof PasswordValues, message: string) =>
        context.addIssue({ code: "custom", path: [path], message });

      if (isCodeSent && !code) flag("code", "Enter the code we emailed you.");

      const check = checkPassword(next, checkOptions);

      if (!check.valid) flag("next", check.error);

      if (confirm !== next) flag("confirm", "Passwords don’t match.");
    }) satisfies z.ZodType<PasswordValues>;
