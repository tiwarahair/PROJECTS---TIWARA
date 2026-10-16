import { z } from "zod";

export const addonSchema = z.object({
  name: z.string().trim().min(1, "Enter a name for the add-on."),
});

export type AddonValues = z.infer<typeof addonSchema>;
