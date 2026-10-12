// Slot generation and distance. Free windows per weekday minus a few seeded (hashed) bookings.
import type { Stylist, Weekday } from "../types/stylist";

const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
/** Platform-wide slot interval in minutes (not exposed to stylists). */
const SLOT_INTERVAL = 30;

export const toMinutes = (time: string): number => {
  const [hours = 0, minutes] = String(time).split(":").map(Number);

  return hours * 60 + (minutes || 0);
};

const formatClockTime = (minutes: number): string => {
  const hourPart = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minutePart = String(minutes % 60).padStart(2, "0");

  return `${hourPart}:${minutePart}`;
};

const hashKey = (key: string): number => {
  let hashValue = 7;

  for (let index = 0; index < key.length; index++)
    hashValue = (hashValue * 31 + key.charCodeAt(index)) % 100003;

  return hashValue;
};

export const slotsFor = (
  stylist: Stylist,
  date: Date,
  durationMinutes: number,
): string[] => {
  const windows =
    stylist.availability?.[WEEKDAYS[date.getDay()] as Weekday] ?? [];

  const slots: string[] = [];

  const seed = hashKey(
    `${stylist.id + date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
  );

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  windows.forEach(([start, end]) => {
    const windowStart = toMinutes(start);
    const windowEnd = toMinutes(end);
    const taken: [number, number][] = [];
    const span = windowEnd - windowStart;

    if (span >= 240) {
      const takenStart =
        windowStart + 60 * (seed % Math.max(1, Math.floor(span / 60) - 2));

      taken.push([takenStart, takenStart + 120]);

      if (seed % 3 === 0) taken.push([windowEnd - 90, windowEnd]);
    }

    for (
      let slot = windowStart;
      slot + durationMinutes <= windowEnd;
      slot += SLOT_INTERVAL
    ) {
      if (isToday && slot <= nowMinutes) continue;

      if (
        taken.some(
          ([takenFrom, takenTo]) =>
            slot < takenTo && slot + durationMinutes > takenFrom,
        )
      )
        continue;

      slots.push(formatClockTime(slot));
    }
  });

  return slots;
};

/** Great-circle distance in miles between two lat/lng points. */
export const miles = (
  latA: number,
  lngA: number,
  latB: number,
  lngB: number,
): number => {
  const EARTH_RADIUS_MILES = 3958.8;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = toRadians(latB - latA);
  const lngDelta = toRadians(lngB - lngA);

  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(latA)) *
      Math.cos(toRadians(latB)) *
      Math.sin(lngDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(haversine));
};
