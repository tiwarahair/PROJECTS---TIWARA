import { z } from "zod";

/**
 * The `/for-stylists` application. Submission is still local-only; this shape
 * is what the `submit-application` endpoint will accept unchanged.
 */

const PHONE_PATTERN = /^[\d\s+()-]+$/;

/** Optional free-text: blank is fine, but anything typed has to be valid. */
const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message);

export const stylistApplicationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Your name is required")
    .max(80, "Your name is too long"),
  business: z
    .string()
    .trim()
    .min(1, "Business name is required")
    .max(80, "Business name is too long"),
  location: z
    .string()
    .trim()
    .min(1, "City or location is required")
    .max(80, "Location is too long"),
  experience: optionalText(40, "Experience is too long"),
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .pipe(z.email("Enter a valid email address")),
  phone: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .regex(PHONE_PATTERN, "Enter a valid phone number")
      .min(7, "Enter a valid phone number")
      .max(20, "Enter a valid phone number"),
  ]),
  instagram: optionalText(40, "Instagram handle is too long"),
  // Marked required in the UI, so it is enforced here too.
  services: z.array(z.string()).min(1, "Select at least one service"),
  bio: optionalText(1000, "Please keep this under 1000 characters"),
  portfolio: z.union([
    z.literal(""),
    z.url("Enter a valid link, including https://"),
  ]),
});

export type StylistApplicationValues = z.infer<typeof stylistApplicationSchema>;
