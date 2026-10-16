import { z } from "zod";
import { isValidEmail } from "../../../utils/validation";

export const clientSchema = z
  .object({ first: z.string(), phone: z.string(), email: z.string() })
  .superRefine(({ first, phone, email }, context) => {
    const flag = (path: keyof ClientValues, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });

    if (!first.trim()) flag("first", "Enter their first name.");

    if (!phone.trim() && !email.trim())
      flag("phone", "Add a phone number or an email address.");

    if (email.trim() && !isValidEmail(email))
      flag("email", "Enter an email address, like name@example.co.uk.");
  });

export type ClientValues = z.infer<typeof clientSchema>;
