import { z } from "zod";

export const nameSchema = z.object({
  first: z.string().trim().min(1, "Enter your first name."),
  last: z.string().trim().min(1, "Enter your last name."),
});

export type NameValues = z.infer<typeof nameSchema>;
