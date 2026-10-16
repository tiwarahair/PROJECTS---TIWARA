import { z } from "zod";

export const closedSchema = z
  .object({
    from: z.string().min(1, "Choose a start date."),
    to: z.string().min(1, "Choose an end date."),
    reason: z.string(),
  })
  .refine(({ from, to }) => !from || !to || from <= to, {
    path: ["to"],
    message: "The end date can’t be before the start date.",
  });

export type ClosedValues = z.infer<typeof closedSchema>;
