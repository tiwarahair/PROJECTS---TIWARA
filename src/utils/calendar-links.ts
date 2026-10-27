import type { CalendarAppLink } from "../types/calendar";

export const toWebcalUrl = (feedUrl: string) =>
  feedUrl.replace(/^https?:/, "webcal:");

/** One-tap subscribe links for the calendar feed at `feedUrl`. */
export const getCalendarAppLinks = (feedUrl: string): CalendarAppLink[] => [
  { app: "apple", label: "Apple Calendar", href: toWebcalUrl(feedUrl) },
  {
    app: "google",
    label: "Google Calendar",
    href: `https://calendar.google.com/calendar/r?${new URLSearchParams({ cid: toWebcalUrl(feedUrl) })}`,
  },
  {
    app: "outlook",
    label: "Outlook",
    href: `https://outlook.live.com/calendar/0/addfromweb?${new URLSearchParams({ url: feedUrl, name: "Tiwára's House bookings" })}`,
  },
];
