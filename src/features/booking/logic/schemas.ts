import { z } from "zod";
import { isValidEmail, isValidMobile } from "../../../utils/validation";
import type { Details } from "./types";

export const detailsSchema = z.object({
  first: z.string().trim().min(1, "Enter your first name"),
  last: z.string().trim().min(1, "Enter your last name"),
  email: z.string().refine(isValidEmail, "Enter an email address"),
  phone: z.string().refine(isValidMobile, "Enter a UK mobile number"),
  notes: z.string(),
}) satisfies z.ZodType<Details>;

export interface LoginValues {
  email: string;
  password: string;
}

export const loginEmailSchema = z.object({
  email: z.string().refine(isValidEmail, "Enter an email address"),
  password: z.string(),
}) satisfies z.ZodType<LoginValues>;

export const loginPasswordSchema = loginEmailSchema.extend({
  password: z.string().min(1, "Enter your password"),
});
