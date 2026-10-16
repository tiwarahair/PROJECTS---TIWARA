import { z } from "zod";
import { roundToPence } from "../../utils/money";
import { parsePounds } from "./logic";

export interface AdjustValues {
  amount: string;
  reason: string;
  other: string;
}

export const getAdjustDelta = (amount: string, base: number) =>
  roundToPence(parsePounds(amount) - base);

export const getAdjustSchema = (base: number) =>
  z
    .object({ amount: z.string(), reason: z.string(), other: z.string() })
    .superRefine(({ amount, reason, other }, context) => {
      const flag = (path: keyof AdjustValues, message: string) =>
        context.addIssue({ code: "custom", path: [path], message });

      if (!amount.trim()) flag("amount", "Enter the new price.");
      else if (getAdjustDelta(amount, base) === 0)
        flag("amount", "That’s the booked price. Enter a different amount.");

      if (!reason) flag("reason", "Choose a reason.");
      else if (reason === "Other" && !other.trim())
        flag("other", "Describe the reason.");
    }) satisfies z.ZodType<AdjustValues>;

export interface ResendValues {
  to: string;
}

export const resendSchema = z.object({
  to: z.string().trim().min(1, "Enter where to send it."),
}) satisfies z.ZodType<ResendValues>;
