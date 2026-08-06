import { z } from "zod";

/**
 * The client-identity step of the booking wizard. Kept in its own module
 * because the same shape validates the `create-booking` request server-side —
 * one schema, both ends.
 */

/** Digits plus the punctuation people actually type into a phone field. */
const PHONE_PATTERN = /^[\d\s+()-]+$/;

export const bookingDetailsSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(60, "First name is too long"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(60, "Last name is too long"),
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .pipe(z.email("Enter a valid email address")),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(PHONE_PATTERN, "Enter a valid phone number")
    .min(7, "Enter a valid phone number")
    .max(20, "Enter a valid phone number"),
  notes: z.string().trim().max(500, "Notes must be under 500 characters"),
});

export type BookingDetailsValues = z.infer<typeof bookingDetailsSchema>;
