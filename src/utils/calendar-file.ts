// "Add to calendar" for a confirmed booking: an .ics file (RFC 5545) and a Google Calendar link.

export interface CalendarEvent {
  ref: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  description: string;
}

/** 2026-10-20T09:00:00Z → 20261020T090000Z */
const toUtcStamp = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

const escapeText = (text: string) =>
  text
    .replace(/[\\;,]/g, (character) => `\\${character}`)
    .replace(/\r?\n/g, "\\n");

const encoder = new TextEncoder();

/** Lines longer than 75 octets continue on the next line after a space. */
const foldLine = (line: string) => {
  const parts: string[] = [];
  let current = "";

  for (const character of line) {
    const limit = parts.length ? 74 : 75;

    if (encoder.encode(current + character).length > limit) {
      parts.push(current);
      current = "";
    }

    current += character;
  }

  return [...parts, current].join("\r\n ");
};

export const getCalendarFile = ({
  ref,
  title,
  startsAt,
  endsAt,
  location,
  description,
}: CalendarEvent) =>
  `${[
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tiwara's House//Bookings//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ref}@tiwarashouse.com`,
    `DTSTAMP:${toUtcStamp(new Date().toISOString())}`,
    `DTSTART:${toUtcStamp(startsAt)}`,
    `DTEND:${toUtcStamp(endsAt)}`,
    `SUMMARY:${escapeText(title)}`,
    `LOCATION:${escapeText(location)}`,
    `DESCRIPTION:${escapeText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(foldLine)
    .join("\r\n")}\r\n`;

export const getGoogleCalendarUrl = ({
  title,
  startsAt,
  endsAt,
  location,
  description,
}: CalendarEvent) => {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toUtcStamp(startsAt)}/${toUtcStamp(endsAt)}`,
    location,
    details: description,
  });

  return `https://calendar.google.com/calendar/render?${params}`;
};
