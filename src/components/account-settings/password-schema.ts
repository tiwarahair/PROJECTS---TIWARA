import { z } from "zod";
import { getFieldFlagger } from "../../utils/validation";
import { checkPassword } from "../../utils/password";
import type { PasswordCheckOptions } from "../../utils/password";

export interface PasswordValues {
  /** `code` is the one emailed to confirm it's them. */
  code: string;
  newPassword: string;
  confirm: string;
}

export const EMPTY_PASSWORD: PasswordValues = {
  code: "",
  newPassword: "",
  confirm: "",
};

export const getPasswordSchema = (
  isCodeSent: boolean,
  checkOptions: PasswordCheckOptions,
) =>
  z
    .object({ code: z.string(), newPassword: z.string(), confirm: z.string() })
    .superRefine(({ code, newPassword, confirm }, context) => {
      const flag = getFieldFlagger(context);

      if (isCodeSent && !code) flag("code", "Enter the code we emailed you.");

      const check = checkPassword(newPassword, checkOptions);

      if (!check.valid) flag("newPassword", check.error);

      if (confirm !== newPassword) flag("confirm", "Passwords don’t match.");
    }) satisfies z.ZodType<PasswordValues>;
