// Shared form rules (the sign-up trigger checks the same UK mobile rule in SQL).
import { z } from "zod";

const emailSchema = z.email();

export const isValidEmail = (value: string): boolean =>
  emailSchema.safeParse(value.trim()).success;

/** A UK mobile in any common format: 07700 900123, 7700900123, +44 7700 900123. */
export const isValidMobile = (value: string): boolean =>
  /^7\d{9}$/.test(
    value.replace(/\D/g, "").replace(/^44/, "").replace(/^0/, ""),
  );
