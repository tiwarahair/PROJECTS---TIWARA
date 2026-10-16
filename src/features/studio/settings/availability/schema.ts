import { z } from "zod";
import { timeToMinutes } from "../../core/format";

export const availabilitySchema = z
  .object({
    hours: z.array(
      z.object({
        day: z.string(),
        on: z.boolean(),
        start: z.string(),
        end: z.string(),
      }),
    ),
  })
  .superRefine(({ hours }, context) =>
    hours.forEach(({ on, start, end }, index) => {
      if (on && timeToMinutes(end) <= timeToMinutes(start))
        context.addIssue({
          code: "custom",
          path: ["hours", index, "end"],
          message: "Closing time must be after opening time.",
        });
    }),
  );

export type AvailabilityValues = z.infer<typeof availabilitySchema>;
