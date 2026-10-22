// a stylist's subscribed calendar (/cal/studio/<key>.ics on the site): their bookings from 30 days ago to a year ahead, read by calendar apps without signing in, so the key is the only way in
import { admin } from "../_shared/admin.ts";
import {
  getBookingEventStatus,
  getCalendarFeed,
} from "../_shared/calendar-file.ts";

interface FeedBooking {
  ref: string;
  client: string | null;
  service: string;
  starts_at: string;
  ends_at: string;
  status: string;
  studio_url: string;
}

Deno.serve(async (request) => {
  const key = new URL(request.url).searchParams.get("key") ?? "";

  const { data, error } = /^[\w-]{32}$/.test(key)
    ? await admin.rpc("get_calendar_feed", { feed_key: key })
    : { data: null, error: null };

  // a 404 can make calendar apps drop the subscription, so only an unknown link gets one
  if (error) return new Response("Try again later.", { status: 503 });

  if (!data)
    return new Response("This calendar link isn't valid.", { status: 404 });

  const events = (data as FeedBooking[]).map(
    ({
      ref,
      client,
      service,
      starts_at: startsAt,
      ends_at: endsAt,
      status,
      studio_url: studioUrl,
    }) => ({
      ref,
      ...getBookingEventStatus(`${client || "Walk-in"} · ${service}`, status),
      startsAt,
      endsAt,
      location: "",
      description: `Booking ${ref}. Open it in Studio: ${studioUrl}`,
    }),
  );

  return new Response(getCalendarFeed(events, "Tiwára's House Studio"), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="tiwaras-house.ics"',
      "cache-control": "no-store",
    },
  });
});
