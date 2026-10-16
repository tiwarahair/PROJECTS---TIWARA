// The server's open times (instants) as London days of the month and "HH:MM" times.
import { toIsoDate } from "../../../utils/dates";

const LONDON_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export interface Slot {
  time: string;
  startsAt: string;
}

/** The month's first and last days, "YYYY-MM-DD" (month 0-based). */
export const getMonthRange = (year: number, month: number) => ({
  from: toIsoDate(new Date(year, month, 1)),
  to: toIsoDate(new Date(year, month + 1, 0)),
});

/** One month's open times by London day of the month, in order. */
export const groupSlotsByDay = (startsAts: string[]) => {
  const days = new Map<number, Slot[]>();

  for (const startsAt of startsAts) {
    const parts = Object.fromEntries(
      LONDON_PARTS.formatToParts(new Date(startsAt)).map(({ type, value }) => [
        type,
        value,
      ]),
    );

    const day = Number(parts.day);

    days.set(day, [
      ...(days.get(day) ?? []),
      { time: `${parts.hour}:${parts.minute}`, startsAt },
    ]);
  }

  return days;
};
