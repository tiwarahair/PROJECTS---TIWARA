import { z } from "zod";
import {
  isValidEmail,
  getFieldFlagger,
  EMAIL_ERROR,
} from "../../../utils/validation";

export const clientSchema = z
  .object({ first: z.string(), phone: z.string(), email: z.string() })
  .superRefine(({ first, phone, email }, context) => {
    const flag = getFieldFlagger(context);

    if (!first.trim()) flag("first", "Enter their first name.");

    if (!phone.trim() && !email.trim())
      flag("phone", "Add a phone number or an email address.");

    if (email.trim() && !isValidEmail(email)) flag("email", EMAIL_ERROR);
  });

export type ClientValues = z.infer<typeof clientSchema>;
