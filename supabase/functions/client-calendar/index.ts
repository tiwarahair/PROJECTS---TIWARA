// a client's subscribed calendar (/cal/<secret>.ics on the site): their bookings from 30 days ago on, read by calendar apps without signing in, so the secret is the only key
import { admin } from "../_shared/admin.ts";
import {
  getBookingEventStatus,
  getCalendarFeed,
} from "../_shared/calendar-file.ts";

interface FeedBooking {
  ref: string;
  service_name: string;
  stylist_name: string;
  starts_at: string;
  ends_at: string;
  where: string;
  status: string;
}

Deno.serve(async (request) => {
  const secret = new URL(request.url).searchParams.get("key") ?? "";

  const { data, error } = /^[a-f0-9]{48}$/.test(secret)
    ? await admin.rpc("get_client_calendar", { secret })
    : { data: null, error: null };

  // a 404 can make calendar apps drop the subscription, so only an unknown link gets one
  if (error) return new Response("Try again later.", { status: 503 });

  if (!data)
    return new Response("This calendar link isn't valid.", { status: 404 });

  const events = (data as FeedBooking[]).map(
    ({
      ref,
      service_name: service,
      stylist_name: stylist,
      starts_at: startsAt,
      ends_at: endsAt,
      where,
      status,
    }) => ({
      ref,
      ...getBookingEventStatus(`${service} with ${stylist}`, status),
      startsAt,
      endsAt,
      location: where,
      description: `Booking ${ref}`,
    }),
  );

  return new Response(getCalendarFeed(events), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="tiwaras-house.ics"',
      "cache-control": "no-store",
    },
  });
});
