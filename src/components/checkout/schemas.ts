import { z } from "zod";
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

export const getRefundAmount = ({ kind, amount }: RefundValues, cap: number) =>
  kind === "full" ? cap : parsePounds(amount);

export const getRefundSchema = (cap: number) =>
  z
    .object({
      kind: z.enum(["full", "partial"]),
      amount: z.string(),
      reason: z.string(),
    })
    .superRefine((values, context) => {
      const flag = (path: keyof RefundValues, message: string) =>
        context.addIssue({ code: "custom", path: [path], message });

      const amount = getRefundAmount(values, cap);

      if (values.kind === "partial" && amount > cap)
        flag("amount", `You can refund up to ${formatMoney(cap)}.`);
      else if (!(amount > 0)) flag("amount", "Enter an amount.");

      if (!values.reason) flag("reason", "Choose a reason.");
    }) satisfies z.ZodType<RefundValues>;
