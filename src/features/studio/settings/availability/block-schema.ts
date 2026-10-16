import { z } from "zod";

interface BlockTimes {
  allDay?: boolean;
  start: string;
  end: string;
}

export const isBlockTimeValid = ({ allDay, start, end }: BlockTimes) =>
  !!allDay || start < end;

export const blockSchema = z
  .object({ allDay: z.boolean(), start: z.string(), end: z.string() })
  .refine(isBlockTimeValid, {
    path: ["end"],
    message: "The end time must be after the start time.",
  });

export type BlockValues = z.infer<typeof blockSchema>;
