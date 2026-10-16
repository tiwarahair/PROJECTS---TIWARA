import { z } from "zod";
import { isValidEmail, isValidMobile } from "../../utils/validation";
import type { Details } from "./booking-state";

export const detailsSchema = z.object({
  first: z.string().trim().min(1, "Enter your first name"),
  last: z.string().trim().min(1, "Enter your last name"),
  email: z.string().refine(isValidEmail, "Enter an email address"),
  phone: z.string().refine(isValidMobile, "Enter a UK mobile number"),
  notes: z.string(),
}) satisfies z.ZodType<Details>;
