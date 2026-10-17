// Bookings are stored as instants and shown in UK time, whatever the device's own time zone.
const LONDON_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const getParts = (date: Date) =>
  Object.fromEntries(
    LONDON_PARTS.formatToParts(date).map(({ type, value }) => [type, value]),
  );

/** "2026-10-28T09:30:00Z" → { date: "2026-10-28", time: "09:30" } (10:30 in summer time). */
export const toLondonTime = (instant: string) => {
  const { year, month, day, hour, minute } = getParts(new Date(instant));

  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
};

/** UK date and clock time → the instant, as an ISO string. */
export const fromLondonTime = (date: string, time: string) => {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const shown = getParts(new Date(guess));

  const shownAt = Date.UTC(
    Number(shown.year),
    Number(shown.month) - 1,
    Number(shown.day),
    Number(shown.hour),
    Number(shown.minute),
  );

  return new Date(guess - (shownAt - guess)).toISOString();
};
