export interface CalendarEvent {
  ref: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  description: string;
  status?: "TENTATIVE" | "CANCELLED";
}

// confirmed bookings show plain; the rest say what they are
const BOOKING_STATUSES: Record<string, { label: string; status?: CalendarEvent["status"] }> = {
  awaiting_confirmation: {
    label: "Awaiting confirmation",
    status: "TENTATIVE",
  },
  completed: { label: "Completed" },
  cancelled: { label: "Cancelled", status: "CANCELLED" },
  auto_cancelled: { label: "Cancelled", status: "CANCELLED" },
  no_show: { label: "No-show" },
};

const HEADER = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tiwara's House//Bookings//EN", "METHOD:PUBLISH"];

const toUtcStamp = (date: string | Date) => new Date(date).toISOString().replace(/[-:]|\.\d{3}/g, "");

const escapeText = (text: string) => text.replace(/[\\;,]/g, (character) => `\\${character}`).replace(/\r?\n/g, "\\n");

const encoder = new TextEncoder();

// lines over 75 bytes continue on the next line after a space
const foldLine = (line: string) => {
  const parts: string[] = [];
  let current = "";

  for (const character of line) {
    if (encoder.encode(current + character).length > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
    }

    current += character;
  }

  return [...parts, current].join("\r\n ");
};

const getEventLines = ({ ref, title, startsAt, endsAt, location, description, status }: CalendarEvent) => [
  "BEGIN:VEVENT",
  `UID:${ref}@tiwarashouse.com`,
  `DTSTAMP:${toUtcStamp(new Date())}`,
  `DTSTART:${toUtcStamp(startsAt)}`,
  `DTEND:${toUtcStamp(endsAt)}`,
  `SUMMARY:${escapeText(title)}`,
  ...(location ? [`LOCATION:${escapeText(location)}`] : []),
  `DESCRIPTION:${escapeText(description)}`,
  ...(status ? [`STATUS:${status}`] : []),
  "END:VEVENT",
];

const toFile = (lines: string[]) => `${[...HEADER, ...lines, "END:VCALENDAR"].map(foldLine).join("\r\n")}\r\n`;

export const getCalendarFile = (event: CalendarEvent) => toFile(getEventLines(event));

/** s subscribed calendar: every event, refreshed hourly by apps that honour it. */
export const getCalendarFeed = (events: CalendarEvent[], name = "Tiwára's House bookings") =>
  toFile([
    `X-WR-CALNAME:${escapeText(name)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...events.flatMap(getEventLines),
  ]);

export const getBookingEventStatus = (title: string, bookingStatus: string) => {
  const shown = BOOKING_STATUSES[bookingStatus];

  return shown ? { title: `${title} (${shown.label})`, status: shown.status } : { title };
};

export const getGoogleCalendarUrl = ({ title, startsAt, endsAt, location, description }: CalendarEvent) =>
  `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toUtcStamp(startsAt)}/${toUtcStamp(endsAt)}`,
    location,
    details: description,
  })}`;
