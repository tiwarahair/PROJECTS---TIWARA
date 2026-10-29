import { z } from "zod";
import { getFieldFlagger } from "../../utils/validation";
import { formatMoney, roundToPence } from "../../utils/money";
import type { RefundValues } from "./data";
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
      const flag = getFieldFlagger(context);

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
  to: z
    .string()
    .trim()
    .min(1, "Enter an email address.")
    .pipe(z.email("Enter a valid email address.")),
}) satisfies z.ZodType<ResendValues>;

export const getRefundAmount = ({ kind, amount }: RefundValues, cap: number) =>
  kind === "full" ? cap : parsePounds(amount);

export const getRefundOverError = (values: RefundValues, cap: number) =>
  values.kind === "partial" && getRefundAmount(values, cap) > cap
    ? `You can refund up to ${formatMoney(cap)}.`
    : "";

export const getRefundSchema = (cap: number) =>
  z
    .object({
      kind: z.enum(["full", "partial"]),
      amount: z.string(),
      reason: z.string(),
    })
    .superRefine((values, context) => {
      const flag = getFieldFlagger(context);

      const overError = getRefundOverError(values, cap);

      if (overError) flag("amount", overError);
      else if (!(getRefundAmount(values, cap) > 0))
        flag("amount", "Enter an amount.");

      if (!values.reason) flag("reason", "Choose a reason.");
    }) satisfies z.ZodType<RefundValues>;
