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

export const getMonthRange = (year: number, month: number) => ({
  from: toIsoDate(new Date(year, month, 1)),
  to: toIsoDate(new Date(year, month + 1, 0)),
});

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
