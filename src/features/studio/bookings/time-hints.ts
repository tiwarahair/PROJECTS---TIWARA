import type { getWorkingHours } from "../core/model";

type WorkingHours = ReturnType<typeof getWorkingHours>;

const getCustomHint = (
  { on, start, end }: WorkingHours,
  isOutside: boolean,
) => {
  if (!on) return "You’re closed this day. You can still book it.";

  if (isOutside)
    return `Outside your hours (${start}–${end}). You can still book it.`;

  return `Any time between ${start} and ${end}`;
};

export const getTimeHints = (
  hours: WorkingHours,
  isCustom: boolean,
  customTime: string,
) => {
  const isOutside =
    isCustom &&
    !!customTime &&
    (!hours.on || customTime < hours.start || customTime >= hours.end);

  return {
    noSlotsText: hours.on
      ? "No free 30-minute starts left this day. Use a custom time if you want to squeeze it in."
      : "You’re closed this day. Use a custom time to book it anyway.",
    customHint: getCustomHint(hours, isOutside),
    isCustomWarn: isOutside || !hours.on,
  };
};
